import { useRef, useState } from 'react'
import { CloudUpload, Download, KeyRound, Lock, RotateCcw, Upload } from 'lucide-react'
import { useStore } from '../store/store'
import { todayISO } from '../lib/format'
import { isSealed, unseal, type Sealed } from '../lib/crypto'
import { Button, Card, Field, PageHeader, Select, TextInput, useConfirm } from '../components/ui'
import type { AppData, PersonId } from '../types'

const REPO_UPLOAD = 'https://github.com/sofygg10/nuestra-independencia/upload/main/public'

function download(name: string, content: unknown) {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function SettingsPage() {
  const { data, update, replace, reset, sealCurrent, changePassword, lock } = useStore()
  const confirm = useConfirm()
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, setPending] = useState<Sealed | null>(null)
  const [importPw, setImportPw] = useState('')
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const applyImport = async (parsed: AppData) => {
    if (parsed?.version !== 1 || !parsed.people?.juan || !Array.isArray(parsed.budget)) throw new Error('formato')
    if (await confirm({ title: 'Importar copia', message: 'Esto reemplazará todos los datos actuales por los del archivo.', confirmLabel: 'Reemplazar' })) {
      replace(parsed)
      setMsg({ ok: true, text: 'Datos importados correctamente.' })
    }
  }

  const importFile = async (f: File) => {
    setMsg(null)
    try {
      const json = JSON.parse(await f.text())
      if (isSealed(json)) setPending(json)
      else await applyImport(json as AppData)
    } catch {
      setMsg({ ok: false, text: 'El archivo no es una copia válida de Nuestra Independencia.' })
    }
  }

  const openPending = async () => {
    if (!pending) return
    try {
      const { value } = await unseal<AppData>(pending, importPw)
      setPending(null)
      setImportPw('')
      await applyImport(value)
    } catch {
      setMsg({ ok: false, text: 'La contraseña de ese archivo no es correcta.' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="Nombres, reglas de reparto, contraseña y copias de seguridad."
        actions={
          <Button variant="secondary" onClick={lock}>
            <Lock size={16} /> Bloquear
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Guardar en GitHub" subtitle="Así tus datos quedan en tu repositorio y los abres desde cualquier navegador o el celular con tu contraseña.">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-600">
            <li>
              <Button size="sm" onClick={async () => download('datos.cifrados.json', await sealCurrent())}>
                <Download size={14} /> Descargar datos.cifrados.json
              </Button>
            </li>
            <li>
              Abre{' '}
              <a href={REPO_UPLOAD} target="_blank" rel="noreferrer" className="font-semibold text-sage-700 underline">
                la carpeta public de tu repositorio
              </a>
              , arrastra el archivo y pulsa <b>Commit changes</b> (reemplaza el anterior).
            </li>
            <li>En 1–2 minutos la página se actualiza. En otro dispositivo, al abrirla con tu contraseña, se carga la copia más nueva.</li>
          </ol>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-sage-50 px-3 py-2 text-xs text-sage-800">
            <CloudUpload size={15} className="mt-0.5 shrink-0" /> El archivo va cifrado con tu contraseña: aunque el repositorio sea público, sin la clave nadie puede leerlo.
          </p>
        </Card>

        <Card title="Copias de seguridad">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={async () => download(`nuestra-independencia-cifrado-${todayISO()}.json`, await sealCurrent())}>
              <Download size={16} /> Exportar cifrado
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                if (await confirm({ title: 'Exportar sin cifrar', message: 'El archivo se podrá leer sin contraseña. Guárdalo en un lugar privado y no lo subas al repositorio público.', confirmLabel: 'Exportar' }))
                  download(`nuestra-independencia-${todayISO()}.json`, data)
              }}
            >
              <Download size={16} /> Exportar sin cifrar
            </Button>
            <Button variant="secondary" onClick={() => file.current?.click()}>
              <Upload size={16} /> Importar
            </Button>
            <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0]).finally(() => (e.target.value = ''))} />
          </div>
          {pending && (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                openPending()
              }}
            >
              <TextInput type="password" placeholder="Contraseña de ese archivo" value={importPw} onChange={(e) => setImportPw(e.target.value)} autoFocus />
              <Button className="shrink-0">Abrir</Button>
            </form>
          )}
          {msg && <p className={`mt-3 text-sm ${msg.ok ? 'text-sage-700' : 'text-red-600'}`}>{msg.text}</p>}
          <p className="mt-3 text-xs text-stone-500">Si olvidas la contraseña, solo una copia sin cifrar te salva. Guarda una de vez en cuando en un lugar privado.</p>
        </Card>

        <Card title="Contraseña">
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault()
              if (pw1.length < 6) return setPwMsg({ ok: false, text: 'Usa al menos 6 caracteres.' })
              if (pw1 !== pw2) return setPwMsg({ ok: false, text: 'Las contraseñas no coinciden.' })
              await changePassword(pw1)
              setPw1('')
              setPw2('')
              setPwMsg({ ok: true, text: 'Contraseña cambiada. Descarga de nuevo datos.cifrados.json y súbelo a GitHub para que también use la nueva.' })
            }}
          >
            <TextInput type="password" placeholder="Nueva contraseña" value={pw1} onChange={(e) => setPw1(e.target.value)} autoComplete="new-password" />
            <TextInput type="password" placeholder="Repítela" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
            <Button variant="secondary" className="sm:col-span-2">
              <KeyRound size={16} /> Cambiar contraseña
            </Button>
          </form>
          {pwMsg && <p className={`mt-3 text-sm ${pwMsg.ok ? 'text-sage-700' : 'text-red-600'}`}>{pwMsg.text}</p>}
        </Card>

        <Card title="Personas">
          <div className="grid gap-4 sm:grid-cols-2">
            {(['juan', 'me'] as PersonId[]).map((id) => (
              <Field key={id} label={id === 'me' ? 'Mi nombre' : 'Nombre de mi novio'}>
                <TextInput
                  value={data.people[id].name}
                  maxLength={24}
                  onChange={(e) =>
                    update((d) => {
                      d.people[id].name = e.target.value
                    })
                  }
                  onBlur={(e) => !e.target.value.trim() && update((d) => void (d.people[id].name = id === 'me' ? 'Yo' : 'Juan'))}
                />
              </Field>
            ))}
            <Field label="Si nadie tiene ingresos, ¿quién responde por el 100 %?" className="sm:col-span-2" hint="Evita dividir por cero cuando ambos ingresos están en $0.">
              <Select value={data.settings.defaultResponsible} onChange={(e) => update((d) => void (d.settings.defaultResponsible = e.target.value as PersonId))}>
                <option value="juan">{data.people.juan.name}</option>
                <option value="me">{data.people.me.name}</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card title="Zona delicada" className="lg:col-span-2">
          <p className="text-sm text-stone-500">Vuelve a los valores iniciales (presupuesto, compras y metas de ejemplo). Se borran ingresos, movimientos, aportes y escenarios. Todos los valores están en pesos colombianos (COP).</p>
          <Button
            variant="danger"
            size="sm"
            className="mt-3"
            onClick={async () => {
              if (await confirm({ title: 'Restablecer todo', message: 'Se borrarán todos los datos registrados. Te recomendamos exportar una copia antes. ¿Continuar?', confirmLabel: 'Restablecer' })) reset()
            }}
          >
            <RotateCcw size={14} /> Restablecer datos
          </Button>
        </Card>
      </div>
    </div>
  )
}
