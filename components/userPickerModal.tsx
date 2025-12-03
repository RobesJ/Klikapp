import { useEffect } from "react";
import { Modal } from "react-native";

interface UserPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onClearAll: () => void;
}

export default function UserPickerModal({
    visible,
    onClearAll,
    onClose
  }: UserPickerModalProps) {

    useEffect(() =>{
        
    },);

    return (
        <Modal>
        </Modal>
    );
}