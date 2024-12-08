import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative rounded-md bg-black overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-full animate-pulse bg-gray-900 opacity-10" />
      </div>
    </div>
  )
}

export { Skeleton }
