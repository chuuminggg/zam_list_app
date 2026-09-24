import { useState } from 'react';
import { safeHttpUrl } from '../../../shared/data';
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

type FormState = typeof EMPTY_FORM;

const toForm = (item: WishItem): FormState => ({
  name: item.name,
  url: item.url ?? '',
  price: item.price != null ? String(item.price) : '',
  memo: item.memo ?? '',
  imageUrl: item.imageUrl ?? '',
  category: item.category,
  status: item.status,
});

interface WishFormProps {
  open: boolean;
  onClose: () => void;
  /** 전달하면 수정 모드, 생략하면 추가 모드. */
  item?: WishItem;
}

export default function WishForm({ open, onClose, item }: WishFormProps) {
  const addItem = useWishStore((s) => s.addItem);
  const updateItem = useWishStore((s) => s.updateItem);
  const [form, setForm] = useState<FormState>(item ? toForm(item) : EMPTY_FORM);

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      url: safeHttpUrl(form.url),
      price: form.price ? Number(form.price) : undefined,
      memo: form.memo.trim() || undefined,
      imageUrl: safeHttpUrl(form.imageUrl),
      category: form.category.trim(),
      status: form.status,
    };
    if (item) {
      updateItem(item.id, payload);
    } else {
      addItem(payload);
    }
    onClose();
  };

  return (
    <Modal open={open} title={item ? '항목 수정' : '항목 추가'} onClose={onClose}>
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
        aria-label="상태"
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
        <Button variant="ghost" onClick={onClose} className="flex-1">
          취소
        </Button>
        <Button
          variant="accent"
          onClick={handleSubmit}
          disabled={!form.name.trim()}
          className="flex-1"
        >
          {item ? '저장' : '추가'}
        </Button>
      </div>
    </Modal>
  );
}
