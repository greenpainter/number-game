import { WORDS } from './word-vocabulary.js';

export function shuffleDeck(words, previousWord, random = Math.random) {
  const deck = [...words];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  if (deck.length > 1 && deck[0] === previousWord) {
    const j = 1 + Math.floor(random() * (deck.length - 1));
    [deck[0], deck[j]] = [deck[j], deck[0]];
  }
  return deck;
}

export function mountWordGame(doc, host) {
  const card = doc.getElementById('word-card');
  const picture = doc.getElementById('word-picture');
  const english = doc.getElementById('word-english');
  const korean = doc.getElementById('word-korean');
  const next = doc.getElementById('word-next');
  const progress = doc.getElementById('word-progress');
  const status = doc.getElementById('word-status');
  const announcement = doc.getElementById('word-announcement');

  let deck = shuffleDeck(WORDS);
  let index = 0;
  let audio;
  let utterance;
  let playback = 0;

  function stopPronunciation() {
    playback++;
    if (audio) {
      audio.onerror = null;
      audio.pause();
      audio = undefined;
    }
    if (utterance) {
      utterance.onerror = null;
      host.speechSynthesis.cancel();
      utterance = undefined;
    }
  }

  function renderCard() {
    const word = deck[index];
    picture.src = word.image;
    english.textContent = word.english;
    korean.textContent = word.korean;
    progress.textContent = `${index + 1} / ${deck.length}`;
  }

  function pronounceWord() {
    stopPronunciation();
    status.textContent = '';
    const request = playback;
    const word = deck[index];
    let triedFallback = false;

    function reportFailure() {
      if (request === playback) {
        status.textContent = '발음을 재생할 수 없어요. 그림을 다시 눌러 보세요.';
      }
    }

    function speakLocally() {
      if (request !== playback || triedFallback) return;
      triedFallback = true;
      if (audio) {
        audio.onerror = null;
        audio.pause();
        audio = undefined;
      }

      try {
        const speech = host.speechSynthesis;
        const voices = speech?.getVoices().filter(voice => voice.localService && /^en(?:[-_]|$)/i.test(voice.lang));
        const voice = voices?.find(candidate => candidate.lang.toLowerCase() === 'en-us') ?? voices?.[0];
        if (!voice || !host.SpeechSynthesisUtterance) {
          reportFailure();
          return;
        }

        utterance = new host.SpeechSynthesisUtterance(word.english);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = 0.85;
        utterance.onerror = reportFailure;
        speech.speak(utterance);
      } catch {
        reportFailure();
      }
    }

    try {
      audio = new host.Audio(word.audio);
      audio.onerror = speakLocally;
      Promise.resolve(audio.play()).catch(speakLocally);
    } catch {
      speakLocally();
    }
  }

  card.addEventListener('click', pronounceWord);
  next.addEventListener('click', () => {
    stopPronunciation();
    index++;
    if (index === deck.length) {
      deck = shuffleDeck(WORDS, deck.at(-1));
      index = 0;
    }
    renderCard();
    status.textContent = '';
    announcement.textContent = `${deck[index].english}, ${deck[index].korean}`;
  });
  host.addEventListener('pagehide', stopPronunciation);
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) stopPronunciation();
  });
  renderCard();
  card.disabled = false;
  next.disabled = false;
}

if (typeof document !== 'undefined') mountWordGame(document, window);
