"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-2xl !border !border-blue-400/25 !bg-gradient-to-br !from-[#1e2433] !via-[#1a2235] !to-[#151b2e] !text-white !shadow-[0_12px_40px_rgba(37,99,235,0.22)] !backdrop-blur-md",
          title: "!font-semibold !text-white !tracking-tight",
          description: "!text-blue-100/80 !text-sm",
          actionButton:
            "!rounded-full !bg-gradient-to-r !from-blue-500 !to-indigo-600 !text-white !font-medium",
          cancelButton: "!rounded-full !bg-white/10 !text-blue-100",
          closeButton:
            "!border-white/10 !bg-white/10 !text-blue-100 hover:!bg-white/20",
          success:
            "!border-emerald-400/30 !bg-gradient-to-br !from-emerald-950/90 !via-[#15241f] !to-[#12151d]",
          error:
            "!border-red-400/30 !bg-gradient-to-br !from-red-950/90 !via-[#241515] !to-[#12151d]",
          info: "!border-blue-400/30 !bg-gradient-to-br !from-blue-950/80 !via-[#1a2235] !to-[#12151d]",
        },
      }}
      style={
        {
          "--normal-bg": "transparent",
          "--normal-text": "#ffffff",
          "--normal-border": "rgba(96, 165, 250, 0.25)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
