const fs = require('fs');
const path = require('path');
const https = require('https');

const audioDir = path.join(__dirname, 'audio');
if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
}

const audioList = [
    { name: 'num_1.mp3', text: '1은 하나!' },
    { name: 'num_2.mp3', text: '2는 둘!' },
    { name: 'num_3.mp3', text: '3은 셋!' },
    { name: 'num_4.mp3', text: '4는 넷!' },
    { name: 'num_5.mp3', text: '5는 다섯!' },
    { name: 'num_6.mp3', text: '6은 여섯!' },
    { name: 'num_7.mp3', text: '7은 일곱!' },
    { name: 'num_8.mp3', text: '8은 여덟!' },
    { name: 'num_9.mp3', text: '9는 아홉!' },
    { name: 'num_10.mp3', text: '10은 열!' },
    { name: 'vehicle_bus.mp3', text: '신나는 꼬마 버스!' },
    { name: 'vehicle_car.mp3', text: '빨간 승용차!' },
    { name: 'vehicle_truck.mp3', text: '신나는 덤프트럭!' },
    { name: 'vehicle_excavator.mp3', text: '포크레인 굴착기!' },
    { name: 'dig_start.mp3', text: '굴착기로 교체하고 모래를 퍼보아요!' },
    { name: 'dig_success.mp3', text: '와! 모래를 가득 실었어요! 이제 덤프트럭을 신나게 운전해보아요!' },
    { name: 'coloring_finish.mp3', text: '와! 알록달록 코끼리가 예뻐졌어요!' },
    { name: 'portal_number.mp3', text: '숫자 놀이를 시작해요!' },
    { name: 'portal_town.mp3', text: '마을 운전 놀이를 시작해요!' },
    { name: 'portal_color.mp3', text: '색칠 놀이를 시작해요!' }
];

function downloadTTS(text, filepath) {
    return new Promise((resolve, reject) => {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ko&client=tw-ob`;
        const file = fs.createWriteStream(filepath);

        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
}

async function generateAll() {
    console.log("Generating audio files...");
    for (const item of audioList) {
        const filepath = path.join(audioDir, item.name);
        try {
            await downloadTTS(item.text, filepath);
            console.log(`Successfully generated: ${item.name} ("${item.text}")`);
        } catch (err) {
            console.error(`Error generating ${item.name}:`, err);
        }
    }
    console.log("All audio files generated successfully!");
}

generateAll();
