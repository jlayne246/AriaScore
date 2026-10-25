import React, {
  useCallback,
} from "react";

import {
  StyleSheet,
  View,
} from "react-native";

import {
  useCameraDevice,
} from "react-native-vision-camera";

import {
  Camera as FaceCamera,
  Face,
} from "react-native-vision-camera-face-detector";

import {
  faceGestureService,
  FaceLandmarks,
} from "../src/services/face_gesture";

interface FaceGestureCameraProps {
  enabled: boolean;

  /**
   * Optional preview mode for debugging.
   * In the real reader this should normally be false.
   */
  showPreview?: boolean;

  exposure?: number;

  onFaceDetectedChange?: (
    detected: boolean,
  ) => void;

  onError?: (
    error: unknown,
  ) => void;
}

export default function FaceGestureCamera({
  enabled,
  showPreview = false,
  exposure = 0,
  onFaceDetectedChange,
  onError,
}: FaceGestureCameraProps) {
  const device =
    useCameraDevice("front");

  const handleFacesDetected =
    useCallback(
      (faces: Face[]) => {
        const detected =
          faces.length > 0;

        onFaceDetectedChange?.(
          detected,
        );

        if (
          !enabled ||
          !detected
        ) {
          return;
        }

        const landmarks =
          mapFaceToLandmarks(
            faces[0],
          );

        if (!landmarks) {
          return;
        }

        faceGestureService
          .processLandmarks(
            landmarks,
          );
      },
      [
        enabled,
        onFaceDetectedChange,
      ],
    );

  if (
    !device
  ) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={
        showPreview
          ? styles.preview
          : styles.hidden
      }
    >
      <FaceCamera
        style={
          StyleSheet.absoluteFill
        }
        device={device}
        exposure={exposure}
        isActive={enabled}
        runLandmarks
        performanceMode="accurate"
        minFaceSize={0.10}
        onFacesDetected={
          handleFacesDetected
        }
        onError={(cameraError) => {
          const message =
            cameraError instanceof Error
              ? cameraError.message
              : String(cameraError);

          const isInactiveExposureRace =
            message.includes(
              "OperationCanceledException",
            ) &&
            message.includes(
              "Camera is not active",
            );

          if (isInactiveExposureRace) {
            console.warn(
              "[FaceGestureCamera] Ignoring transient exposure update while camera is inactive.",
            );

            return;
          }

          console.error(
            "[FaceGestureCamera] Camera error:",
            cameraError,
          );

          onError?.(
            cameraError,
          );
        }}
      />
    </View>
  );
}

function mapFaceToLandmarks(
  face: Face,
): FaceLandmarks | null {
  const landmarks =
    face.landmarks;

  if (!landmarks) {
    return null;
  }

  const leftEye =
    landmarks.LEFT_EYE;

  const rightEye =
    landmarks.RIGHT_EYE;

  const mouthLeft =
    landmarks.MOUTH_LEFT;

  const mouthRight =
    landmarks.MOUTH_RIGHT;

  const leftCheek =
    landmarks.LEFT_CHEEK;

  const rightCheek =
    landmarks.RIGHT_CHEEK;

  if (
    !leftEye ||
    !rightEye ||
    !mouthLeft ||
    !mouthRight
  ) {
    return null;
  }

  const mouthCenter = {
    x:
      (
        mouthLeft.x +
        mouthRight.x
      ) /
      2,

    y:
      (
        mouthLeft.y +
        mouthRight.y
      ) /
      2,
  };

  const faceWithPose =
    face as Face & {
      yawAngle?: number;
      pitchAngle?: number;
      rollAngle?: number;
    };

  const hasPose =
    typeof faceWithPose
      .yawAngle === "number" &&
    typeof faceWithPose
      .pitchAngle === "number" &&
    typeof faceWithPose
      .rollAngle === "number";

  return {
    leftEye: {
      x: leftEye.x,
      y: leftEye.y,
    },

    rightEye: {
      x: rightEye.x,
      y: rightEye.y,
    },

    mouthLeft: {
      x: mouthLeft.x,
      y: mouthLeft.y,
    },

    mouthRight: {
      x: mouthRight.x,
      y: mouthRight.y,
    },

    mouthCenter,

    leftCheek:
      leftCheek
        ? {
            x: leftCheek.x,
            y: leftCheek.y,
          }
        : undefined,

    rightCheek:
      rightCheek
        ? {
            x: rightCheek.x,
            y: rightCheek.y,
          }
        : undefined,

    nose:
      landmarks.NOSE_BASE
        ? {
            x:
              landmarks
                .NOSE_BASE.x,

            y:
              landmarks
                .NOSE_BASE.y,
          }
        : undefined,

    pose:
      hasPose
        ? {
            yaw:
              faceWithPose
                .yawAngle!,

            pitch:
              faceWithPose
                .pitchAngle!,

            roll:
              faceWithPose
                .rollAngle!,
          }
        : undefined,

    timestamp:
      Date.now(),
  };
}

const styles =
  StyleSheet.create({
    preview: {
      width: "100%",
      height: "100%",

      overflow:
        "hidden",
    },

    hidden: {
      position:
        "absolute",

      width:
        2,

      height:
        2,

      left:
        0,

      top:
        0,

      opacity:
        0,

      overflow:
        "hidden",
    },
  });