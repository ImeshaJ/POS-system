import { Loader2 } from "lucide-react"

type LoaderProps = {
	label?: string
	className?: string
}

export function Loader({ label = "Loading", className = "" }: LoaderProps) {
	return (
		<div className={`flex items-center justify-center gap-3 text-slate-500 ${className}`.trim()}>
			<Loader2 className="h-5 w-5 animate-spin" />
			<span className="text-sm font-medium">{label}</span>
		</div>
	)
}

export default Loader
