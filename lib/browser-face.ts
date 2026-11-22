let faceApiPromise: Promise<typeof import("@vladmandic/face-api")> | null = null;
let modelsLoaded = false;

export async function getFaceDescriptor(image: HTMLImageElement): Promise<number[] | null> {
  if (!faceApiPromise) faceApiPromise = import("@vladmandic/face-api");
  const faceapi = await faceApiPromise;

  if (!modelsLoaded) {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    ]);
    modelsLoaded = true;
  }

  const attempts = [
    new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.35 }),
    new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.25 }),
  ];
  for (const options of attempts) {
    const result = await faceapi
      .detectSingleFace(image, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (result) return Array.from(result.descriptor);
  }
  return null;
}
