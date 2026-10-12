"use client"

import { copy } from "@sequel/copy"
import { Check, Copy } from "lucide-react"
import { useEffect, useState } from "react"
import { UI_TIMING } from "@/config/constants"
import { copyToClipboard } from "@/lib/clipboard"
import { Button, type ButtonProps } from "./button"
import { toast } from "./toast"
import { Tooltip } from "./tooltip"

type CopyButtonProps = Omit<ButtonProps, "onClick" | "children"> & {
  value: string
  label?: string
  showLabel?: boolean
}

export function CopyButton({
  value,
  label = copy.actions.copy,
  showLabel = false,
  size = "icon-xs",
  variant = "ghost",
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) {
      return
    }
    const timer = window.setTimeout(() => setCopied(false), UI_TIMING.copiedFeedbackMs)
    return () => window.clearTimeout(timer)
  }, [copied])
  const onClick = async () => {
    const ok = await copyToClipboard(value)
    if (ok) {
      setCopied(true)
    } else {
      toast.error(copy.states.copyFailed)
    }
  }
  const labelSize = size && !size.startsWith("icon") ? size : "xs"
  const button = (
    <Button
      size={showLabel ? labelSize : size}
      variant={variant}
      onClick={onClick}
      aria-label={label}
      {...props}
    >
      {copied ? <Check className="text-success" /> : <Copy />}
      {showLabel ? (copied ? copy.actions.copied : label) : null}
    </Button>
  )
  if (showLabel) {
    return button
  }
  return <Tooltip content={copied ? copy.actions.copied : label}>{button}</Tooltip>
}
