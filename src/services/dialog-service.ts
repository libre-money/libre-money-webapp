import { Dialog, Notify } from "quasar";

export const NotificationType = {
  SUCCESS: "SUCCESS",
  LOGIN: "LOGIN",
  FAILED: "FAILED",
};

export const dialogService = {
  alert(title: string, message: string) {
    return new Promise((accept) => {
      Dialog.create({
        title,
        message,
      })
        .onOk(() => {
          accept(true);
        })
        .onCancel(() => {
          accept(false);
        })
        .onDismiss(() => {
          accept(false);
        });
    });
  },

  confirm(title: string, message: string) {
    return new Promise((accept) => {
      Dialog.create({
        title,
        message,
        cancel: true,
        persistent: true,
      })
        .onOk(() => {
          accept(true);
        })
        .onCancel(() => {
          accept(false);
        })
        .onDismiss(() => {
          accept(false);
        });
    });
  },

  prompt(title: string, message: string, initialValue: string): Promise<string | null> {
    return new Promise((accept) => {
      Dialog.create({
        title,
        message,
        prompt: {
          model: initialValue,
          type: "text",
        },
        cancel: true,
        persistent: true,
      })
        .onOk((answer) => {
          accept(answer);
        })
        .onCancel(() => {
          accept(null);
        })
        .onDismiss(() => {
          accept(null);
        });
    });
  },

  notify(notificationType: string, message: string) {
    let color = "green-4";
    let textColor = "white";
    let icon = "cloud_done";
    if (notificationType === NotificationType.LOGIN) {
      color = "green-4";
      textColor = "white";
      icon = "cloud_done";
    } else if (notificationType === NotificationType.SUCCESS) {
      color = "green-4";
      textColor = "white";
      icon = "done";
    }
    Notify.create({
      color,
      textColor,
      icon,
      message,
    });
  },
};
