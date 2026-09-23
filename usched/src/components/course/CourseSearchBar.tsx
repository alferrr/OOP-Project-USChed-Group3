import { Search } from 'lucide-react'

interface Props {
  q: string
  department: string
  departments: string[]
  onQ: (v: string) => void
  onDepartment: (v: string) => void
}

export default function CourseSearchBar({ q, department, departments, onQ, onDepartment }: Props) {
  const field = 'rounded-md border border-green-100 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-gold-300'
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative min-w-56 flex-1">
        <Search size={16} className="absolute left-3 top-2.5 text-green-700/60" aria-hidden />
        <input aria-label="Search courses" className={`${field} w-full pl-9`} placeholder="Search by code or name"
          value={q} onChange={(e) => onQ(e.target.value)} />
      </div>
      <select aria-label="Department" className={field} value={department} onChange={(e) => onDepartment(e.target.value)}>
        <option value="">All departments</option>
        {departments.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>
  )
}
