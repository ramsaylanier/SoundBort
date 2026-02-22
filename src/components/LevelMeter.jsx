import { cn } from '@/lib/utils'

/**
 * A VU-style level meter that fills based on a 0-1 level value.
 * @param {number} level - Level from 0 to 1
 * @param {'horizontal' | 'vertical'} orientation - Bar fill direction
 * @param {string} className - Additional CSS classes
 */
export function LevelMeter({ level, orientation = 'horizontal', className }) {
  const clampedLevel = Math.min(1, Math.max(0, level ?? 0))

  return (
    <div
      className={cn(
        'overflow-hidden rounded-full bg-muted',
        orientation === 'horizontal' && 'h-1.5 w-12 min-w-12',
        orientation === 'vertical' && 'h-8 w-1.5 min-h-8 flex flex-col justify-end',
        className
      )}
      role="meter"
      aria-valuenow={Math.round(clampedLevel * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'bg-primary transition-[width,height] duration-75 ease-out',
          orientation === 'horizontal' && 'h-full',
          orientation === 'vertical' && 'w-full'
        )}
        style={
          orientation === 'horizontal'
            ? { width: `${clampedLevel * 100}%` }
            : { height: `${clampedLevel * 100}%` }
        }
      />
    </div>
  )
}
