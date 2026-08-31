import type { Area } from "react-easy-crop";

import {
  Button,
  Label,
  Modal,
  Slider,
  SliderFill,
  SliderOutput,
  SliderThumb,
  SliderTrack,
  Spinner,
  toast,
} from "@heroui/react";
import { RotateCcw, RotateCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import Cropper from "react-easy-crop";
import { useEffect, useState } from "react";

import { getAccountErrorMessage, uploadAccountAvatar } from "./account-api";
import { getCroppedWebpBlob } from "./crop-image";

import { useTranslation } from "@/i18n";

/**
 * 头像裁剪弹窗：Cropper（缩放滑杆 + 90° 旋转）→ canvas 合成 256×256 WebP →
 * FormData 上传（POST /account/avatar，服务端中转 Supabase Storage）。
 * imageSrc 由父组件以 objectURL 传入，关闭弹窗时由父组件统一 revoke。
 */

export interface AvatarCropDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** 待裁剪图片 objectURL（父组件负责创建与释放） */
  imageSrc: string | null;
  /** 上传成功回调（参数为服务端返回的带时间戳头像 URL） */
  onUploaded: (avatar: string) => void;
}

/** 缩放范围（Cropper 倍率） */
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

/** 旋转步长（±90°，循环归一） */
const ROTATION_STEP = 90;

export function AvatarCropDialog({
  isOpen,
  onOpenChange,
  imageSrc,
  onUploaded,
}: AvatarCropDialogProps) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  // 重置 key：换图/重开弹窗时复位 Cropper 内部状态
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setResetKey((prev) => prev + 1);
    }
  }, [isOpen, imageSrc]);

  const mutation = useAvatarUploadMutation({
    imageSrc,
    croppedAreaPixels,
    rotation,
    onUploaded,
    onClose: () => onOpenChange(false),
  });

  return (
    <Modal.Backdrop
      isKeyboardDismissDisabled
      isDismissable={false}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-md">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{t("features.account.avatar.title")}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            {isOpen && imageSrc ? (
              <div className="flex flex-col gap-4">
                <div className="relative h-72 w-full overflow-hidden rounded-lg">
                  <Cropper
                    key={resetKey}
                    showGrid
                    aspect={1}
                    crop={crop}
                    image={imageSrc}
                    rotation={rotation}
                    zoom={zoom}
                    onCropChange={setCrop}
                    onCropComplete={(_area, areaPixels) =>
                      setCroppedAreaPixels(areaPixels)
                    }
                    onRotationChange={setRotation}
                    onZoomChange={setZoom}
                  />
                </div>
                <Slider
                  aria-label={t("features.account.avatar.zoom")}
                  maxValue={ZOOM_MAX}
                  minValue={ZOOM_MIN}
                  step={0.1}
                  value={zoom}
                  onChange={(value) =>
                    setZoom(Array.isArray(value) ? (value[0] ?? 1) : value)
                  }
                >
                  <Label>{t("features.account.avatar.zoom")}</Label>
                  <SliderOutput>{zoom.toFixed(1)}x</SliderOutput>
                  <SliderTrack>
                    <SliderFill />
                    <SliderThumb />
                  </SliderTrack>
                </Slider>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    isDisabled={mutation.isPending}
                    size="sm"
                    variant="secondary"
                    onPress={() =>
                      setRotation((prev) => (prev - ROTATION_STEP) % 360)
                    }
                  >
                    <RotateCcw className="size-4" />
                    {t("features.account.avatar.rotateLeft")}
                  </Button>
                  <Button
                    isDisabled={mutation.isPending}
                    size="sm"
                    variant="secondary"
                    onPress={() =>
                      setRotation((prev) => (prev + ROTATION_STEP) % 360)
                    }
                  >
                    <RotateCw className="size-4" />
                    {t("features.account.avatar.rotateRight")}
                  </Button>
                </div>
              </div>
            ) : null}
          </Modal.Body>
          <Modal.Footer className="w-full">
            <Button slot="close" variant="secondary">
              {t("common.cancel")}
            </Button>
            <Button
              isDisabled={!imageSrc}
              isPending={mutation.isPending}
              onPress={() => mutation.mutate()}
            >
              {({ isPending }) =>
                isPending ? (
                  <>
                    <Spinner color="current" size="sm" />
                    {t("features.account.avatar.uploading")}
                  </>
                ) : (
                  t("features.account.avatar.upload")
                )
              }
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

interface AvatarUploadMutationOptions {
  imageSrc: string | null;
  croppedAreaPixels: Area | null;
  rotation: number;
  onUploaded: (avatar: string) => void;
  onClose: () => void;
}

function useAvatarUploadMutation({
  imageSrc,
  croppedAreaPixels,
  rotation,
  onUploaded,
  onClose,
}: AvatarUploadMutationOptions) {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      if (!imageSrc || !croppedAreaPixels) {
        throw new Error(t("features.account.avatar.notReady"));
      }

      return uploadAccountAvatar(
        await getCroppedWebpBlob(imageSrc, croppedAreaPixels, rotation),
      );
    },
    onSuccess: (result) => {
      toast.success(t("features.account.avatar.uploadSuccess"));
      onUploaded(result.avatar);
      onClose();
    },
    onError: (error) => {
      toast.danger(getAccountErrorMessage(error));
    },
  });
}
