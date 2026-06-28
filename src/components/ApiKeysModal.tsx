"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { apiFetch } from "@/lib/csrf";
import { ChevronDownIcon, CloseIcon, KeyIcon, TrashIcon } from "./icons";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  service: string;
  isActive: boolean;
}

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SERVICES = [
  { id: "fal", name: "fal.ai", description: "Image & video generation API" },
];

// Validation patterns for different services
const API_KEY_VALIDATORS: Record<
  string,
  {
    pattern: RegExp;
    example: string;
    description: string;
  }
> = {
  fal: {
    // fal.ai keys are: UUID:secret (e.g., 8cc1454c-94ce-4036-a5eb-47391dbf99dd:b6982599b42886db4513d7a2096f5604)
    pattern:
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[a-z0-9]{16,}$/i,
    example:
      "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    description: "UUID followed by colon and secret key",
  },
};

function validateApiKey(
  key: string,
  service: string
): { isValid: boolean; error?: string } {
  const validator = API_KEY_VALIDATORS[service];
  if (!validator) {
    // No validator for this service, accept any non-empty key
    return { isValid: key.trim().length > 0 };
  }

  if (!key.trim()) {
    return { isValid: false, error: "API key is required" };
  }

  if (!validator.pattern.test(key.trim())) {
    return {
      isValid: false,
      error: `Invalid format. Expected: ${validator.example}`,
    };
  }

  return { isValid: true };
}

export default function ApiKeysModal({ isOpen, onClose }: ApiKeysModalProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [selectedService, setSelectedService] = useState("fal");
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Validate key format when key or service changes
  const keyValidation = validateApiKey(newKey, selectedService);
  const isKeyFormatValid = keyValidation.isValid;
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const serviceDropdownRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await apiFetch("/api/api-keys");
      if (response.ok) {
        const keys = await response.json();
        setApiKeys(keys);
      } else {
        toast.error("Failed to load API keys");
      }
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchApiKeys();
    } else {
      // Reset dropdown state when modal closes
      setIsServiceDropdownOpen(false);
    }
  }, [isOpen, fetchApiKeys]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Handle dropdown positioning
  useEffect(() => {
    if (isServiceDropdownOpen && serviceDropdownRef.current) {
      const rect = serviceDropdownRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isServiceDropdownOpen]);

  // Handle click outside for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(event.target as Node) &&
        serviceDropdownRef.current &&
        !serviceDropdownRef.current.contains(event.target as Node)
      ) {
        setIsServiceDropdownOpen(false);
      }
    };

    if (isServiceDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isServiceDropdownOpen]);

  const handleValidate = async () => {
    if (!newKey.trim()) return;

    setIsValidating(true);

    try {
      const response = await apiFetch("/api/api-keys/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey, service: selectedService }),
      });

      const result = await response.json();
      if (result.isValid) {
        toast.success("API key is valid");
      } else {
        toast.error(result.message || "API key is invalid");
      }
    } catch {
      toast.error("Could not validate key. Check your connection.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!newKey.trim()) return;

    setIsSaving(true);

    try {
      const serviceName = SERVICES.find((s) => s.id === selectedService)?.name;
      const response = await apiFetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serviceName,
          key: newKey,
          service: selectedService,
        }),
      });

      if (response.ok) {
        setNewKey("");
        fetchApiKeys();
        toast.success("API key saved");
      } else {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error || "Failed to save API key");
      }
    } catch {
      toast.error("Failed to save API key");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (service: string) => {
    try {
      const response = await apiFetch(`/api/api-keys?service=${service}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchApiKeys();
        toast.success("API key deleted");
      } else {
        toast.error("Failed to delete API key");
      }
    } catch {
      toast.error("Failed to delete API key");
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isOpen
          ? "visible bg-black/80 opacity-100 backdrop-blur-sm"
          : "invisible opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        className={`mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-white/10 bg-black/60 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 ${
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <KeyIcon />
            </div>
            <div>
              <h2 className="text-sm font-medium text-white">API Keys</h2>
              <p className="text-xs text-zinc-300">
                Manage your API credentials
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-white/5 hover:text-white"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Existing Keys */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-6 animate-spin rounded-full border-2 border-zinc-600 border-t-pink-400" />
          </div>
        ) : apiKeys.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">Saved Keys</p>
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {apiKey.name}
                  </p>
                  <p className="font-mono text-xs text-zinc-400">
                    {apiKey.key}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(apiKey.service)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-white/5 hover:text-red-400"
                  title="Delete"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {/* Add New Key */}
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">
            {apiKeys.length > 0 ? "Update Key" : "Add Key"}
          </p>

          {/* Service Selector */}
          <div>
            <label className="mb-2 block text-xs text-zinc-400">Service</label>
            <button
              ref={serviceDropdownRef}
              onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-sm text-white transition outline-none hover:bg-white/10"
            >
              <span>
                {SERVICES.find((s) => s.id === selectedService)?.name} -{" "}
                {SERVICES.find((s) => s.id === selectedService)?.description}
              </span>
              <ChevronDownIcon />
            </button>
            {isServiceDropdownOpen &&
              createPortal(
                <div
                  ref={dropdownMenuRef}
                  style={{
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                  }}
                  className="fixed z-[9999] rounded-2xl border border-white/10 bg-black/80 p-2 shadow-xl backdrop-blur-xl"
                >
                  <div className="flex flex-col gap-1">
                    {SERVICES.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => {
                          setSelectedService(service.id);
                          setIsServiceDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors outline-none hover:bg-white/5 ${
                          selectedService === service.id ? "bg-white/10" : ""
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">
                            {service.name}
                          </span>
                          <span className="text-xs text-zinc-300">
                            {service.description}
                          </span>
                        </div>
                        {selectedService === service.id && (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            className="text-pink-400"
                          >
                            <path d="M13.7071 4.29289C14.0976 4.68342 14.0976 5.31658 13.7071 5.70711L6.70711 12.7071C6.31658 13.0976 5.68342 13.0976 5.29289 12.7071L2.29289 9.70711C1.90237 9.31658 1.90237 8.68342 2.29289 8.29289C2.68342 7.90237 3.31658 7.90237 3.70711 8.29289L6 10.5858L12.2929 4.29289C12.6834 3.90237 13.3166 3.90237 13.7071 4.29289Z" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>,
                document.body
              )}
          </div>

          {/* API Key Input */}
          <div>
            <label className="mb-2 block text-xs text-zinc-400">API Key</label>
            <input
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Enter your API key..."
              className={`w-full rounded-2xl border bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-400 transition outline-none hover:bg-white/10 focus:bg-white/10 ${
                newKey && !isKeyFormatValid
                  ? "border-red-500/50"
                  : "border-white/10"
              }`}
            />
            {newKey && !isKeyFormatValid && keyValidation.error && (
              <p className="mt-2 text-xs text-red-400">{keyValidation.error}</p>
            )}
            {!newKey && API_KEY_VALIDATORS[selectedService] && (
              <p className="mt-2 text-xs text-zinc-400">
                Format: {API_KEY_VALIDATORS[selectedService].example}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleValidate}
              disabled={!isKeyFormatValid || isValidating}
              className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isValidating ? "Validating..." : "Validate"}
            </button>
            <button
              onClick={handleSave}
              disabled={!isKeyFormatValid || isSaving}
              className="flex h-10 flex-1 items-center justify-center rounded-xl bg-pink-400 text-sm font-semibold text-black transition hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
