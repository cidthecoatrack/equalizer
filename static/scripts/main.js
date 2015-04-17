
var output = document.getElementById('output');
var canvas = document.getElementById('equalizerCanvas');
var canvasContext = canvas.getContext('2d');
var color = 'rgba(88, 197, 67, 0.3)';
var filesDropped = null;
var audioIndex = 0;
var sampleSize = 5;

var audio = document.createElement('audio');
var audioContext = new AudioContext();
var animationFrame = null;
var isPaused = false;
var currentSongDuration = 0;

audio.addEventListener('ended', function() {
  audio.currentTime = 0;

  if (audioIndex <= filesDropped.length - 1)
    start(filesDropped[audioIndex++]);
  else
    askForDrop();
});

audio.addEventListener('loadedmetadata', function() {
  currentSongDuration = audio.duration;
  $('#seekControl').attr("max", currentSongDuration);
});

var source = audioContext.createMediaElementSource(audio);

if (!audioContext.createGain)
    audioContext.createGain = audioContext.createGainNode;

if (!audioContext.createStereoPanner)
    audioContext.createStereoPanner = audioContext.createPanner;

var gainNode = audioContext.createGain();
var panNode = audioContext.createStereoPanner();
var analyser = audioContext.createAnalyser();

chainSources();

window.onresize = windowResize;
windowResize();

function chainSources() {
  source.connect(gainNode);
  gainNode.connect(panNode);
  panNode.connect(analyser);
  analyser.connect(audioContext.destination);
}

function stopEvent (event) {
  event.preventDefault();
  event.stopPropagation();
}

function windowResize () {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function reduce (array, size) {
  if (size >= array.length) { return array; }
  var newArray = [];
  var step = parseInt(array.length / size);
  
  for (var i = 0; i < array.length; i += step) {
    var sum = 0;
    for (var j = 0; j < step && (i + j) < array.length; j++) {
      sum += array[i + j];
    }
    newArray.push(parseInt(sum / step));
  }
  
  return newArray;
}

var cells = [[]];
var alive = true;
var dead = false;
var scaleSize = 255;

for (var i = 0; i < scaleSize; i++) {
  var row = [];
  cells.push(row);

  for (var j = 0; j < scaleSize; j++) {
    cells[i].push(dead);
  }
}

function renderFrame (audio, analyser) {
  var frequencyData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(frequencyData);
  frequencyData = reduce(frequencyData, scaleSize);
  
  playGameOfLife();
  setFrequencySeeds(frequencyData);
  drawLivingCells();

  // var columnWidth = canvas.width / frequencyData.length;
  // var columnHeight = canvas.height / 255;
  
  // canvasContext.clearRect(0, 0, canvas.width, canvas.height);
  // canvasContext.fillStyle = 'rgba(0, 0, 0, 0.3)';
  // canvasContext.strokeStyle = color;
  // canvasContext.lineCap = 'round';

  // canvasContext.beginPath();
  // canvasContext.moveTo(0, canvas.height);

  // for (var i = 1; i < frequencyData.length; i++) {
  //   canvasContext.lineTo(i * columnWidth, canvas.height - 10 - frequencyData[i] * columnHeight);
  // }
  // canvasContext.lineTo(canvas.width, canvas.height);
  // canvasContext.closePath();
  // canvasContext.fill();
  // canvasContext.stroke();
  
  animationFrame = requestAnimationFrame(function () {
    renderFrame(audio, analyser);
  });
}

function setFrequencySeeds(frequencyData) {
  for(var column = 0; column < scaleSize; column++) {
    var row = frequencyData[column];
    cells[column][row] = alive;
  }
}

function playGameOfLife() {
  // for(var column = 0; column < scaleSize; column++) {
  //   for(var row = 0; row < scaleSize; row++) {
  //     cells[column][row] = dead;
  //   }
  // }

  for(var column = 0; column < scaleSize; column++) {
    for(var row = 0; row < scaleSize; row++) {
      var neighbors = getNeighbors(column, row);
      cells[column][row] = cellShouldLive(cells[column][row], neighbors);
    }
  }
}

function getNeighbors(c, r) {
  var colMin = Math.max(column, 0);
  var rowMin = Math.max(row, 0);
  var colMax = Math.min(column, scaleSize);
  var rowMax = Math.min(row, scaleSize);

  var neighbors = [];

  for(var column = colMin; column < colMax; column++) {
    for(var row = rowMin; row < rowMax; row++) {
      neighbors.push(cells[column][row]);
    }
  }

  return neighbors;
}

function cellShouldLive(cell, neighbors) {
  var livingNeighborsTotal = getLivingNeighborsTotal(neighbors);

  if (livingNeighborsTotal > 3 || livingNeighborsTotal < 2)
    return false;
  
  if (cell == dead && livingNeighborsTotal == 3)
    return true;

  return cell;
}

function getLivingNeighborsTotal(neighbors) {
  var total = 0;

  for(var i = 0; i < neighbors.length; i++) {
    if (neighbors[i] == alive) {
      total++;
    }
  }

  return total;
}

function drawLivingCells() {
  canvasContext.clearRect(0, 0, canvas.width, canvas.height);
  canvasContext.fillStyle = color;
  canvasContext.strokeStyle = color;
  canvasContext.lineCap = 'round';

  canvasContext.beginPath();

  var cellHeight = canvas.height / scaleSize;
  var cellWidth = canvas.width / scaleSize;
  
  for(var column = 0; column < cells.length; column++) {
    for(var row = 0; row < cells[column].length; row++) {
      if (cells[column][row] == alive) {
        var x = cellWidth * column;
        var y = canvas.height - 10 - cellHeight * row;

        canvasContext.rect(x, y, cellWidth, cellHeight);
      }
    }
  }

  canvasContext.closePath();
  canvasContext.fill();
  canvasContext.stroke();
}

function start (file) {
  var url = URL.createObjectURL(file);
  audio.autoplay = true;
  audio.src = url;
  play();
  $('h1').html(file.name);
  cancelAnimationFrame(animationFrame);
  renderFrame(audio, analyser);
}

function play() {
  $('#toggleTunes > span')
    .removeClass('glyphicon-play')
    .addClass('glyphicon-pause');

  $('#paused').fadeOut();
  audio.play();
  isPaused = false;
}

function pause() {
  $('#toggleTunes > span')
    .removeClass('glyphicon-pause')
    .addClass('glyphicon-play');
    
  $('#paused').fadeIn();
  audio.pause();
  isPaused = true;
}

function dropAudio (event) {
  $('#controls').fadeIn().css('display', 'flex');
  stopEvent(event);
  filesDropped = event.originalEvent.dataTransfer.files;
  audioIndex = 0;
  start(filesDropped[audioIndex++]);
}

function toggleAudio () {
  if (isPaused)
    play();
  else
    pause();
}

function seek(rangeElement) {
  audio.currentTime = Math.ceil(rangeElement.value);
}

function changeVolume(rangeElement) {
  var volume = rangeElement.value;
  var fraction = parseInt(rangeElement.value) / parseInt(rangeElement.max);
  gainNode.gain.value = fraction * fraction;
}

function changeSamples(rangeElement) {
  sampleSize = parseInt(rangeElement.value);
}

function changePan(value) {
  panNode.pan.value = value;
}

function askForDrop() {
  $('#controls').fadeOut();
  $('h1').html('Equalizer - Drop a Tune!');
  $('#seekControl').val(0);
}

setInterval(function() {
  var r = getRandomNumberBetween(0, 256);
  var g = getRandomNumberBetween(0, 256);
  var b = getRandomNumberBetween(0, 256);

  color = 'rgba(' + r + ', ' + g + ', ' + b + ', 0.6)';
}, 3000);

function getRandomNumberBetween(from, to) {
  return Math.floor((Math.random() * to) + from + 1);
}

$(window)
  .on('dragover', stopEvent)
  .on('dragenter', stopEvent)
  .on('drop', dropAudio)
  .keypress(function(e) {
    if (e.keyCode == 0 || e.keyCode == 32) {
      toggleAudio();
    }
  });

$('#toggleTunes').on('click', function(e) {
  toggleAudio();
  this.blur();
});

$('.pan-control').on('click', 'span', function(e) {
  var panValue = parseInt($(e.target).parent().data('pan-value'));
  changePan(panValue);
});