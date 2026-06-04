"use client";

import { Settings, X } from "lucide-react";
import { ControlSidebarContent, type ControlPanelProps } from "./ControlSidebar";

type ControlDrawerProps = ControlPanelProps & {
  open: boolean;
  onClose: () => void;
};

export function ControlDrawer({ open, onClose, ...controlProps }: ControlDrawerProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[#3d3428]/20 transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[min(75vh,32rem)] flex-col overflow-y-auto overflow-x-visible rounded-t-2xl border border-b-0 border-[#e8dfd0] bg-[#fffef9] shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          open ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
        aria-hidden={!open}
        role="dialog"
        aria-modal={open}
        aria-label="Tree settings"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#e8dfd0] px-5 py-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-[#8b7d6b]" aria-hidden />
            <h2 className="font-serif text-lg font-medium text-[#3d3428]">Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-5 overflow-visible px-5 py-5">
          <ControlSidebarContent {...controlProps} />
        </div>
      </aside>
    </>
  );
}
