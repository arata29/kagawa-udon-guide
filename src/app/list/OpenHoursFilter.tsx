"use client";

import { useRef } from "react";

type OpenHoursFilterProps = {
  openDay: string;
  openAt: string;
  openNow: boolean;
};

export default function OpenHoursFilter({
  openDay,
  openAt,
  openNow,
}: OpenHoursFilterProps) {
  const openDayRef = useRef<HTMLSelectElement>(null);
  const openAtRef = useRef<HTMLInputElement>(null);
  const openNowRef = useRef<HTMLInputElement>(null);

  const handleTimeChange = () => {
    if (openNowRef.current?.checked) {
      openNowRef.current.checked = false;
    }
  };

  const handleOpenNowChange = (checked: boolean) => {
    if (!checked) return;
    if (openDayRef.current) openDayRef.current.value = "";
    if (openAtRef.current) openAtRef.current.value = "";
  };

  return (
    <div className="grid gap-2 sm:flex sm:items-center sm:justify-between">
      <select
        ref={openDayRef}
        name="openDay"
        defaultValue={openDay}
        className="sm:flex-1"
        onChange={handleTimeChange}
      >
        <option value="">曜日（指定なし）</option>
        <option value="0">日曜</option>
        <option value="1">月曜</option>
        <option value="2">火曜</option>
        <option value="3">水曜</option>
        <option value="4">木曜</option>
        <option value="5">金曜</option>
        <option value="6">土曜</option>
      </select>
      <input
        type="time"
        name="openAt"
        defaultValue={openAt}
        placeholder="営業時間（例: 12:00）"
        className="sm:flex-1"
        onChange={handleTimeChange}
        ref={openAtRef}
      />
      <label className="flex w-fit items-center gap-2 text-left text-sm whitespace-nowrap justify-start justify-self-start self-start sm:justify-end sm:ml-4 sm:items-center sm:self-auto">
        <input
          ref={openNowRef}
          type="checkbox"
          name="openNow"
          value="1"
          defaultChecked={openNow}
          onChange={(event) => handleOpenNowChange(event.target.checked)}
        />
        営業中のみ
      </label>
    </div>
  );
}
