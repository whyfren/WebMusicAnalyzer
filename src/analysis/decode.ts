

var essentia = new EssentiaWASM.EssentiaJS(false);
  essentia.arrayToVector = EssentiaWASM.arrayToVector;
  var vectorSignal = essentia.arrayToVector(msg.data.audioSignal);