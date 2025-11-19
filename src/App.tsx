import { useEffect, useState } from "react"
import { supabase } from "./lib/supabaseClient"

interface TestTableRow {
  test: string
  name: string
}

function App() {
  const [rows, setRows] = useState<TestTableRow[]>([])

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("test_table").select("*")
      if (error) {
        console.error(error)
      } else {
        setRows(data || [])
      }
    }
    load()
  }, [])

  return (
    <div>
      <h1>Probando Supabase</h1>
      <table>
        <thead>
          <tr>
            <th>Test</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td>{row.test}</td>
              <td>{row.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App
