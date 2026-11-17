import { Search } from 'lucide-react'

interface Props {
  q: string
  department: string
  departments: string[]
  onQ: (v: string) => void
  onDepartment: (v: string) => void
}

export default function CourseSearchBar({ q, department, departments, onQ, onDepartment }: Props) {
  const field = 'control'
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative min-w-56 flex-1">
        <Search size={18} className="absolute left-4 top-3.5 text-green-700/60" aria-hidden />
        <input aria-label="Search courses" className={`${field} pl-11`} placeholder="Search by code or name"
          value={q} onChange={(e) => onQ(e.target.value)} />
      </div>
      <select aria-label="Department" className={`${field} w-auto!`} value={department} onChange={(e) => onDepartment(e.target.value)}>
        <option value="">All departments</option>
        {departments.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>
  )
}
