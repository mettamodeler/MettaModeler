interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ChartContainer({
  className,
  children,
  ...props
}: ChartContainerProps) {
  return (
    <div className={`space-y-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

interface ChartLegendProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ChartLegend({
  className,
  children,
  ...props
}: ChartLegendProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-4 text-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface ChartLegendItemProps extends React.HTMLAttributes<HTMLDivElement> {
  color: string;
}

export function ChartLegendItem({
  className,
  children,
  color,
  ...props
}: ChartLegendItemProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`} {...props}>
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{
          backgroundColor: color,
        }}
      />
      <span className="text-muted-foreground">{children}</span>
    </div>
  );
}