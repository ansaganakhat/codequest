# Face Wheel — MediaPipe model compatibility fix (2026-11-17)

## Issue reported in Cloudflare Pages
The camera opened and the user could see the live feed, but "Анықталған беттер: 0" showed a red exception:

```text
CalculatorGraph::Run() failed:
TensorsToDetectionsCalculator RET_CHECK failure
raw_box_tensor->shape().dims[1] == num_boxes_
(2304 vs 896)
```

The `blaze_face_full_range.tflite` model was returning **2304** anchors while the
JavaScript Tasks FaceDetector graph expected **896**. The model architecture
does not match the graph configuration; adjusting lighting or browser permission
cannot resolve a model shape incompatibility.

## Fix
- `frontend/src/face-wheel-model.js` — use the official **BlazeFace short-range**
  model with 896 anchors in the MediaPipe Tasks FaceDetector.
- `frontend/src/LearningStudio.jsx` — import compatible model URL and
  retain a 1080p camera request plus six overlapping image-tile scans.
- The thumbnail selection, random wheel animation, winner overlay and
  no-upload privacy approach remain unchanged.
- If a detector graph fails, close it and retry after refreshing
  `Ctrl+F5`; do not leave a corrupted detector in memory.
- CI adds model compatibility / tile coverage tests.

## Test instructions
1. Navigate to https://codequest-ai-ansagan.pages.dev and refresh using
   `Ctrl+F5` after Cloudflare's new deployment is successful.
2. Open Face Wheel, grant camera permission, click `Беттерді анықтау`.
3. Verify at least one face is detected in a well-lit frontal view;
   the MediaPipe `2304 vs 896` error should not appear.
4. With multiple visible subjects, verify thumbnail selection works,
   then click START to display a randomly chosen face.
5. Adjust camera position/lighting for distant/blurred faces. The short-range
   model is not guaranteed to detect every far-away or occluded face.
6. Check on Chrome desktop with an actual camera. CI cannot test
   physical cameras or the web WASM runtime in all browsers.

Sources: Google AI Edge Face Detector docs and the MediaPipe
full-range graph source (the latter explicitly specifies 2304 anchors).
