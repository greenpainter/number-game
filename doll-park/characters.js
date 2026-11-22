import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';

const avatarFolder = './assets/avatars/';
const resolveAsset = path => globalThis.PLAY_ASSETS?.[path] ?? path;
export const ROSTER = [
    ['garden', '가든'], ['sailor', '세일러'], ['silverBlue', '실버 블루'],
    ['ashOlive', '애쉬 포니'], ['cherryBow', '체리 리본'], ['lilac', '라일락 포니'],
    ['indigo', '인디고 리본'], ['apricot', '애프리콧 포니'], ['teddy', '곰돌이'],
].map(([id, name]) => Object.freeze({id, name, portrait: avatarFolder + id + '.webp'}));

const loader = new GLTFLoader();
const files = new Map();
const jointNames = ['Hips', 'Spine', 'Chest', 'Neck', 'Head',
    ...['L','R'].flatMap(side => ['Collar', 'UpperArm', 'Forearm', 'Hand', 'Thigh', 'Shin', 'Foot'].map(part => part+'.'+side))];
const byCleanName = new Map(jointNames.map(n => [THREE.PropertyBinding.sanitizeNodeName(n), n]));

function modelFile(id) {
    if (!files.has(id)) {
        const path = avatarFolder + id + '.glb';
        const result = loader.loadAsync(resolveAsset(path)).catch(error => {
            files.delete(id);
            throw error;
        });
        files.set(id, result);
    }
    return files.get(id);
}

function cloneBase(source) {
    const root = source.clone(true);
    const originals = [], copies = [], map = new Map();
    source.traverse(m => originals.push(m));
    root.traverse(m => copies.push(m));
    originals.forEach((obj,i) => map.set(obj, copies[i]));
    const skins = new Map();
    originals.forEach(obj => {
        if (!obj.isSkinnedMesh) return;
        if (!skins.has(obj.skeleton)) {
            skins.set(obj.skeleton, new THREE.Skeleton(obj.skeleton.bones.map(b => map.get(b)),
                obj.skeleton.boneInverses.map(mat => mat.clone())));
        }
        map.get(obj).bind(skins.get(obj.skeleton), obj.bindMatrix);
    });
    return {model:root, skeleton:skins.values().next().value};
}

export async function loadCharacter(id) {
    if (!ROSTER.some(row => row.id === id)) throw new Error('Unknown avatar ' + id);
    const [base, appearance] = await Promise.all([modelFile('base'), modelFile(id)]);
    const {model, skeleton} = cloneBase(base.scene);
    appearance.scene.traverse(source => {
        if (!source.isSkinnedMesh) return;
        const part = new THREE.SkinnedMesh(source.geometry, source.material);
        part.name = source.name;
        part.bind(skeleton, source.bindMatrix);
        model.add(part);
    });
    model.traverse(obj => {
        if (!obj.isSkinnedMesh) return;
        obj.castShadow = true;
        obj.receiveShadow = false;
        // Runtime ride animations go beyond the rest and clip bounds.
        obj.frustumCulled = false;
    });

    const root = new THREE.Group();
    root.name = 'Avatar_' + id;
    model.scale.setScalar(1.36 / 3.12);
    root.add(model);
    const bones = {}, restPose = {};
    for (const bone of skeleton.bones) {
        const original = byCleanName.get(bone.name) ?? bone.userData.name ?? bone.name;
        bones[original] = bone;
        restPose[original] = {quaternion:bone.quaternion.clone(), position:bone.position.clone()};
    }
    const mixer = new THREE.AnimationMixer(model);
    const actions = Object.fromEntries(base.animations.map(clip => [clip.name,mixer.clipAction(clip)]));
    let current;
    function play(name, fade = .18) {
        const next = actions[name];
        if (!next || next === current && next.isRunning()) return next;
        next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
        if (current && current !== next) {
            if (fade > 0) current.crossFadeTo(next,fade,false);
            else current.stop();
        }
        current = next;
        return next;
    }
    function dispose() {
        root.removeFromParent();
        mixer.stopAllAction();
        mixer.uncacheRoot(model);
        skeleton.dispose();
    }
    play('Idle',0);
    return {id,root,scene:root,model,mixer,actions,bones,restPose,play,dispose,
        height:id === 'teddy' ? 1.50 : 1.40};
}
