package com.alqev.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;

import com.google.common.util.concurrent.ListenableFuture;

import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AlqevCameraActivity extends AppCompatActivity {

    public static final String EXTRA_PHOTO_PATH = "alqev_photo_path";
    public static final String EXTRA_ERROR = "alqev_camera_error";

    private PreviewView previewView;
    private ImageCapture imageCapture;
    private ProcessCameraProvider cameraProvider;
    private ExecutorService cameraExecutor;
    private Button captureButton;
    private boolean captureInProgress = false;

    private final ActivityResultLauncher<String> cameraPermissionLauncher =
            registerForActivityResult(
                    new ActivityResultContracts.RequestPermission(),
                    granted -> {
                        if (Boolean.TRUE.equals(granted)) {
                            startCamera();
                        } else {
                            finishWithError("CAMERA_PERMISSION_DENIED");
                        }
                    }
            );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        cameraExecutor = Executors.newSingleThreadExecutor();
        setContentView(createCameraUi());

        if (
                ContextCompat.checkSelfPermission(
                        this,
                        Manifest.permission.CAMERA
                ) == PackageManager.PERMISSION_GRANTED
        ) {
            startCamera();
        } else {
            cameraPermissionLauncher.launch(
                    Manifest.permission.CAMERA
            );
        }
    }

    private View createCameraUi() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        previewView = new PreviewView(this);
        previewView.setImplementationMode(
                PreviewView.ImplementationMode.PERFORMANCE
        );
        previewView.setScaleType(
                PreviewView.ScaleType.FILL_CENTER
        );

        root.addView(
                previewView,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        TextView title = new TextView(this);
        title.setText("ALQEV Belge Kamerası");
        title.setTextColor(Color.WHITE);
        title.setTextSize(16f);
        title.setGravity(Gravity.CENTER);
        title.setBackgroundColor(0x66000000);
        title.setPadding(
                dp(16),
                dp(10),
                dp(16),
                dp(10)
        );

        FrameLayout.LayoutParams titleParams =
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        titleParams.gravity = Gravity.TOP;
        root.addView(
                title,
                titleParams
        );

        Button closeButton = new Button(this);
        closeButton.setText("✕");
        closeButton.setTextSize(18f);

        closeButton.setOnClickListener(v -> {
            setResult(
                    Activity.RESULT_CANCELED
            );

            finish();
        });

        FrameLayout.LayoutParams closeParams =
                new FrameLayout.LayoutParams(
                        dp(64),
                        dp(56)
                );

        closeParams.gravity =
                Gravity.TOP | Gravity.START;

        closeParams.leftMargin =
                dp(12);

        closeParams.topMargin =
                dp(48);

        root.addView(
                closeButton,
                closeParams
        );

        captureButton = new Button(this);
        captureButton.setText("Fotoğraf Çek");
        captureButton.setTextSize(16f);
        captureButton.setEnabled(false);

        captureButton.setOnClickListener(
                v -> takePhoto()
        );

        FrameLayout.LayoutParams captureParams =
                new FrameLayout.LayoutParams(
                        dp(180),
                        dp(64)
                );

        captureParams.gravity =
                Gravity.BOTTOM
                        | Gravity.CENTER_HORIZONTAL;

        captureParams.bottomMargin =
                dp(36);

        root.addView(
                captureButton,
                captureParams
        );

        return root;
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> providerFuture =
                ProcessCameraProvider.getInstance(this);

        providerFuture.addListener(
                () -> {
                    try {
                        cameraProvider =
                                providerFuture.get();

                        Preview preview =
                                new Preview.Builder()
                                        .build();

                        preview.setSurfaceProvider(
                                previewView
                                        .getSurfaceProvider()
                        );

                        imageCapture =
                                new ImageCapture.Builder()
                                        .setCaptureMode(
                                                ImageCapture
                                                        .CAPTURE_MODE_MINIMIZE_LATENCY
                                        )
                                        .setFlashMode(
                                                ImageCapture
                                                        .FLASH_MODE_AUTO
                                        )
                                        .build();

                        CameraSelector cameraSelector =
                                CameraSelector
                                        .DEFAULT_BACK_CAMERA;

                        cameraProvider.unbindAll();

                        cameraProvider.bindToLifecycle(
                                this,
                                cameraSelector,
                                preview,
                                imageCapture
                        );

                        captureButton.setEnabled(true);

                    } catch (Exception error) {
                        finishWithError(
                                "CAMERAX_START_FAILED"
                        );
                    }
                },
                ContextCompat.getMainExecutor(this)
        );
    }

    private void takePhoto() {
        if (
                imageCapture == null
                        || captureInProgress
        ) {
            return;
        }

        captureInProgress = true;
        captureButton.setEnabled(false);
        captureButton.setText("Çekiliyor...");

        File cameraDir =
                new File(
                        getCacheDir(),
                        "alqev_camera"
                );

        if (
                !cameraDir.exists()
                        && !cameraDir.mkdirs()
        ) {
            finishWithError(
                    "CAMERA_CACHE_ERROR"
            );

            return;
        }

        File outputFile;

        try {
            outputFile =
                    File.createTempFile(
                            "alqev_camerax_",
                            ".jpg",
                            cameraDir
                    );

        } catch (Exception error) {
            finishWithError(
                    "CAMERA_FILE_CREATE_FAILED"
            );

            return;
        }

        ImageCapture.OutputFileOptions outputOptions =
                new ImageCapture
                        .OutputFileOptions
                        .Builder(
                                outputFile
                        )
                        .build();

        imageCapture.takePicture(
                outputOptions,
                cameraExecutor,
                new ImageCapture.OnImageSavedCallback() {

                    @Override
                    public void onImageSaved(
                            @NonNull
                            ImageCapture.OutputFileResults
                                    outputFileResults
                    ) {
                        runOnUiThread(() -> {
                            Intent result =
                                    new Intent();

                            result.putExtra(
                                    EXTRA_PHOTO_PATH,
                                    outputFile
                                            .getAbsolutePath()
                            );

                            setResult(
                                    Activity.RESULT_OK,
                                    result
                            );

                            finish();
                        });
                    }

                    @Override
                    public void onError(
                            @NonNull
                            ImageCaptureException exception
                    ) {
                        //noinspection ResultOfMethodCallIgnored
                        outputFile.delete();

                        runOnUiThread(
                                () -> finishWithError(
                                        "CAMERAX_CAPTURE_FAILED"
                                )
                        );
                    }
                }
        );
    }

    private void finishWithError(
            String errorCode
    ) {
        Intent result =
                new Intent();

        result.putExtra(
                EXTRA_ERROR,
                errorCode
        );

        setResult(
                Activity.RESULT_CANCELED,
                result
        );

        finish();
    }

    private int dp(
            int value
    ) {
        return Math.round(
                value
                        * getResources()
                                .getDisplayMetrics()
                                .density
        );
    }

    @Override
    protected void onDestroy() {
        if (cameraProvider != null) {
            try {
                cameraProvider.unbindAll();
            } catch (Exception ignored) {
            }
        }

        if (cameraExecutor != null) {
            cameraExecutor.shutdown();
        }

        super.onDestroy();
    }
}