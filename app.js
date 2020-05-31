const MODEL_PARAMS = {
  flipHorizontal: true,   // flip e.g for video 
  imageScaleFactor: 0.7,  // reduce input image size for gains in speed.
  maxNumBoxes: 2,        // maximum number of boxes to detect
  iouThreshold: 0.5,      // ioU threshold for non-max suppression
  scoreThreshold: 0.86,    // confidence threshold for predictions.
};
let model;

//HTML selectors
const video = document.querySelector('#video');
const videoCanvas = document.querySelector('#video-canvas');
const videoContext = videoCanvas.getContext('2d');

//Used for development
const canvas = document.querySelector('#canvas');
const canvasContext = canvas.getContext('2d');



const audioContextClass = (window.AudioContext ||
                    window.webkitAudioContext ||
                    window.mozAudioContext ||
                    window.oAudioContext ||
                    window.msAudioContext);
var audioContext = new audioContextClass();
let soundWave;

const MIN_FREQ = 40; //In Hz
const MAX_FREQ = 7000; //In Hz
let leftHand;
let rightHand;

handTrack.startVideo(video).then((status) =>{
  if (status){
    setInterval(runDetection, 0.1);
  }
});

function runDetection(){
  model.detect(video).then((predictions) => {
    if (predictions.length > 0){
      predictions.forEach((element) => {
        if (element.bbox[0] < canvas.clientWidth * 0.25){
          leftHand = element;
        } else {
          rightHand = element;
        }
      });
    }
    model.renderPredictions(predictions, canvas, canvasContext, video);

    //Delimit where volume and tone are detected
    canvasContext.strokeStyle = "red";
    canvasContext.beginPath();
    canvasContext.moveTo(canvas.clientWidth * 0.25, 0);
    canvasContext.lineTo(canvas.clientWidth * 0.25, canvas.clientHeight);
    canvasContext.stroke();
    canvasContext.beginPath();
    canvasContext.moveTo(0, canvas.clientHeight*0.75);
    canvasContext.lineTo(canvas.clientWidth, canvas.clientHeight * 0.75);
    canvasContext.stroke();
    updateSoundWave(predictions);
  });
}

function updateSoundWave(){
  if (leftHand){
    console.log(leftHand.bbox[1] + ' ' + canvas.clientHeight*0.75);
    soundWave.setVolume(1- leftHand.bbox[1] / (canvas.clientHeight*0.75));
    // console.log('volume: ' + 1- leftHand.bbox[1] / canvas.clientHeight);

  }
  if (rightHand){
    soundWave.setFrequency(MIN_FREQ + ((rightHand.bbox[0]-canvas.clientWidth*0.25) / canvas.clientWidth*0.75) * (MAX_FREQ-MIN_FREQ));
    // console.log('frequency: ' + MIN_FREQ + (rightHand.bbox[0] / canvas.clientWidth) * (MAX_FREQ-MIN_FREQ))
  }
}

handTrack.load(MODEL_PARAMS).then(lmodel =>{
  model = lmodel;
  soundWave = new SoundWave(audioContext, 440);
  soundWave.start();
});

class SoundWave {
  constructor(audioContext, initialFreq) {
    this.oscillator = audioContext.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = initialFreq !== undefined? initialFreq : 440; // Hz
    this.volume = audioContext.createGain();
    this.volume.gain.value = 0.5;
    this.oscillator.connect(this.volume); 
    this.volume.connect(audioContext.destination); 
  }

  start(){
    this.oscillator.start();
  }

  stop(){
    this.oscillator.stop(audioContext.currentTime);//TODO: check if oscillator.stop() works as well
  }

  getFrequency(){
    return this.oscillator.frequency.value;
  }

  setFrequency(newFreq){
    this.oscillator.frequency.setValueAtTime(this.getFrequency(), audioContext.currentTime);
    this.oscillator.frequency.exponentialRampToValueAtTime(newFreq, audioContext.currentTime+0.1);
  }

  getVolume(){
    return this.volume.gain.value;
  }

  setVolume(newVolume){
    if (newVolume < 0){
      newVolume = 0;
    }
    console.log(newVolume);
    this.volume.gain.setValueAtTime(this.getVolume(), audioContext.currentTime);
    this.volume.gain.exponentialRampToValueAtTime(newVolume, audioContext.currentTime+0.1);
  }

  //Wave types can be 'sine', 'square', 'sawtooth', 'triangle'
  setWaveType(newWaveType){
    this.oscillator.setWaveType(newWaveType);
  }

  update(newFreq, newVolume){

  }
}