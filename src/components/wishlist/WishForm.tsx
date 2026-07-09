import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import Select from '../common/Select';
import { STATUSES, STATUS_LABEL } from '../../constants/wish';
import { useWishStore } from '../../stores/wishStore';
import type { WishItem } from '../../types';

const FIELDS = [
  { key: 'name', placeholder: '이름 *', type: 'text' },
  { key: 'url', placeholder: 'URL (선택)', type: 'text' },
  { key: 'price', placeholder: '가격 (선택)', type: 'number' },
  { key: 'imageUrl', placeholder: '이미지 URL (선택)', type: 'text' },
  { key: 'category', placeholder: '카테고리', type: 'text' },
  { key: 'memo', placeholder: '메모', type: 'text' },
] as const;

const EMPTY_FORM = {
  name: '',
  url: '',
  price: '',
  memo: '',
  imageUrl: '',
  category: '',
  status: 'want' as WishItem['status'],
};

interface WishFormProps {
  open: boolean;
  onClose: () => void;
}

export default function WishForm({ open, onClose }: WishFormProps) {
  const addItem = useWishStore((s) => s.addItem);
  const [form, setForm] = useState(EMPTY_FORM);

  const close = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    addItem({
      name: form.name.trim(),
      url: form.url.trim() || undefined,
      price: form.price ? Number(form.price) : undefined,
      memo: form.memo.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      category: form.category.trim(),
      status: form.status,
    });
    close();
  };

  return (
    <Modal open={open} title="항목 추가" onClose={close}>
      {FIELDS.map(({ key, placeholder, type }) => (
        <Input
          key={key}
          accent="purple"
          type={type}
          placeholder={placeholder}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="text-sm"
        />
      ))}
      <Select
        accent="purple"
        value={form.status}
        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as WishItem['status'] }))}
        className="text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </Select>
      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={close} className="flex-1">
          취소
        </Button>
        <Button variant="accent" onClick={handleSubmit} disabled={!form.name.trim()} className="flex-1">
          추가
        </Button>
      </div>
    </Modal>
  );
}
