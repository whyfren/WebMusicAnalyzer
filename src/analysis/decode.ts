export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContext.decodeAudioData(reader.result as ArrayBuffer)
        .then(resolve)
        .catch(reject);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};