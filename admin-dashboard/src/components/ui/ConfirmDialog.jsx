import Modal from "./Modal";
import Button from "./Button";

export default function ConfirmDialog({ open, onClose, onConfirm, title = "Confirm", message, confirmText = "Delete" }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmText}</Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}
