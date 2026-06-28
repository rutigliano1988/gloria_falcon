"use client";

"use client";

import { useState, useTransition } from "react";
import { enviarSolicitud, type SolicitudFormData } from "./actions";
import { GraduationCap, CheckCircle2, AlertCircle } from "lucide-react";
import { calcularEdad } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";
const sectionCls = "bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6";

const ESTADOS_VE = [
  "Amazonas","Anzoátegui","Apure","Aragua","Barinas","Bolívar","Carabobo",
  "Cojedes","Delta Amacuro","Distrito Capital","Falcón","Guárico","Lara",
  "Mérida","Miranda","Monagas","Nueva Esparta","Portuguesa","Sucre","Táchira",
  "Trujillo","La Guaira","Yaracuy","Zulia",
];

interface Props { token: string }

type RepForm = {
  tipo: "MADRE" | "PADRE" | "TUTOR";
  apellidosNombres: string;
  cedula: string;
  fechaNacimiento: string;
  telefonoHab: string;
  telefonoCelular: string;
  telefonoOficina: string;
  email: string;
  ocupacion: string;
};

const emptyRep = (tipo: "MADRE" | "PADRE" | "TUTOR"): RepForm => ({
  tipo, apellidosNombres: "", cedula: "", fechaNacimiento: "", telefonoHab: "",
  telefonoCelular: "", telefonoOficina: "", email: "", ocupacion: "",
});

function RepFields({
  rep,
  setter,
  title,
}: {
  rep: RepForm;
  setter: React.Dispatch<React.SetStateAction<RepForm>>;
  title: string;
}) {
  const set = (k: keyof RepForm, v: string) => setter((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={labelCls}>Apellidos y Nombres *</label>
          <input className={inputCls} value={rep.apellidosNombres}
            onChange={(e) => set("apellidosNombres", e.target.value)}
            placeholder="Apellido Apellido, Nombre Nombre" />
        </div>
        <div>
          <label className={labelCls}>Cédula de Identidad</label>
          <input className={inputCls} value={rep.cedula}
            onChange={(e) => set("cedula", e.target.value)}
            placeholder="V-12345678" />
        </div>
        <div>
          <label className={labelCls}>Fecha de Nacimiento *</label>
          <DatePicker value={rep.fechaNacimiento} onChange={(v) => set("fechaNacimiento", v)} />
          {rep.fechaNacimiento && <p className="text-xs text-gray-500 mt-1">Edad: {calcularEdad(new Date(rep.fechaNacimiento))} años</p>}
        </div>
        <div>
          <label className={labelCls}>Teléfono Habitación</label>
          <input className={inputCls} value={rep.telefonoHab}
            onChange={(e) => set("telefonoHab", e.target.value)}
            placeholder="0212-0000000" />
        </div>
        <div>
          <label className={labelCls}>Teléfono Celular</label>
          <input className={inputCls} value={rep.telefonoCelular}
            onChange={(e) => set("telefonoCelular", e.target.value)}
            placeholder="0414-0000000" />
        </div>
        <div>
          <label className={labelCls}>Teléfono Oficina</label>
          <input className={inputCls} value={rep.telefonoOficina}
            onChange={(e) => set("telefonoOficina", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Ocupación</label>
          <input className={inputCls} value={rep.ocupacion}
            onChange={(e) => set("ocupacion", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Correo Electrónico</label>
          <input className={inputCls} type="email" value={rep.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="ejemplo@correo.com" />
        </div>
      </div>
    </div>
  );
}

export function InscripcionForm({ token }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string; referencia?: string } | null>(null);

  // Datos del alumno
  const [alumno, setAlumno] = useState({
    primerApellido: "", segundoApellido: "", primerNombre: "", segundoNombre: "",
    cedulaEscolar: "", sexo: "", fechaNacimiento: "",
    municipioNacimiento: "", estadoNacimiento: "", domicilio: "", telefonoHogar: "",
    procedencia: "HOGAR", nombrePlantelOrigen: "",
  });

  // Representantes (madre + padre por defecto, el tutor es opcional)
  const [madre, setMadre] = useState<RepForm>(emptyRep("MADRE"));
  const [padre, setPadre] = useState<RepForm>(emptyRep("PADRE"));
  const [includeMadre, setIncludeMadre] = useState(true);
  const [includePadre, setIncludePadre] = useState(false);

  // Autorizados para retiro
  const [autorizados, setAutorizados] = useState([
    { nombre: "", cedula: "" },
    { nombre: "", cedula: "" },
  ]);

  // Contactos de emergencia
  const [contactos, setContactos] = useState([
    { nombre: "", telefono: "" },
    { nombre: "", telefono: "" },
    { nombre: "", telefono: "" },
  ]);

  // Salud
  const [salud, setSalud] = useState({
    enfermedadActual: "", tratamiento: "", alergiasMedicamentos: "",
    medicamentoFiebre: "", seguroSaludTelefono: "",
  });

  const setAlumnoField = (k: string, v: string) => setAlumno((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const reps: SolicitudFormData["representantes"] = [];
    if (includeMadre && madre.apellidosNombres.trim()) {
      reps.push({
        ...madre,
        fechaNacimiento: madre.fechaNacimiento || null,
        cedula: madre.cedula || null,
        telefonoHab: madre.telefonoHab || null,
        telefonoCelular: madre.telefonoCelular || null,
        telefonoOficina: madre.telefonoOficina || null,
        email: madre.email || null,
        ocupacion: madre.ocupacion || null,
      });
    }
    if (includePadre && padre.apellidosNombres.trim()) {
      reps.push({
        ...padre,
        fechaNacimiento: padre.fechaNacimiento || null,
        cedula: padre.cedula || null,
        telefonoHab: padre.telefonoHab || null,
        telefonoCelular: padre.telefonoCelular || null,
        telefonoOficina: padre.telefonoOficina || null,
        email: padre.email || null,
        ocupacion: padre.ocupacion || null,
      });
    }

    const data: SolicitudFormData = {
      primerApellido: alumno.primerApellido,
      segundoApellido: alumno.segundoApellido || null,
      primerNombre: alumno.primerNombre,
      segundoNombre: alumno.segundoNombre || null,
      cedulaEscolar: alumno.cedulaEscolar || null,
      municipioNacimiento: alumno.municipioNacimiento || null,
      estadoNacimiento: alumno.estadoNacimiento || null,
      sexo: alumno.sexo as "M" | "F",
      fechaNacimiento: alumno.fechaNacimiento,
      domicilio: alumno.domicilio || null,
      telefonoHogar: alumno.telefonoHogar || null,
      procedencia: alumno.procedencia as SolicitudFormData["procedencia"],
      nombrePlantelOrigen: alumno.nombrePlantelOrigen || null,
      representantes: reps,
      autorizados: autorizados
        .map((a, i) => ({ nombre: a.nombre, cedula: a.cedula || null, orden: i + 1 }))
        .filter((a) => a.nombre.trim()),
      contactosEmergencia: contactos
        .map((c, i) => ({ nombre: c.nombre, telefono: c.telefono, orden: i + 1 }))
        .filter((c) => c.nombre.trim() && c.telefono.trim()),
      datosSalud: {
        enfermedadActual: salud.enfermedadActual || null,
        tratamiento: salud.tratamiento || null,
        alergiasMedicamentos: salud.alergiasMedicamentos || null,
        medicamentoFiebre: salud.medicamentoFiebre || null,
        seguroSaludTelefono: salud.seguroSaludTelefono || null,
      },
    };

    startTransition(async () => {
      const res = await enviarSolicitud(token, data);
      setResult(res);
    });
  };

  if (result?.ok) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="rounded-full bg-green-100 p-4 mb-4">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Formulario enviado!</h2>
        <p className="text-gray-600 mb-1">La información fue recibida correctamente.</p>
        <p className="text-gray-600 mb-4">
          El personal del colegio revisará los datos y completará la inscripción.
        </p>
        <div className="rounded-lg bg-gray-100 px-6 py-3">
          <p className="text-xs text-gray-500 mb-1">Número de referencia</p>
          <p className="text-xl font-mono font-bold text-gray-900">{result.referencia}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error general */}
      {result?.error && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{result.error}</p>
        </div>
      )}

      {/* Sección 1: Datos del Estudiante */}
      <div className={sectionCls}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">1. Datos del Estudiante</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Primer Apellido *</label>
            <input className={inputCls} required value={alumno.primerApellido}
              onChange={(e) => setAlumnoField("primerApellido", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Segundo Apellido</label>
            <input className={inputCls} value={alumno.segundoApellido}
              onChange={(e) => setAlumnoField("segundoApellido", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Primer Nombre *</label>
            <input className={inputCls} required value={alumno.primerNombre}
              onChange={(e) => setAlumnoField("primerNombre", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Segundo Nombre</label>
            <input className={inputCls} value={alumno.segundoNombre}
              onChange={(e) => setAlumnoField("segundoNombre", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Cédula Escolar</label>
            <input className={inputCls} value={alumno.cedulaEscolar}
              onChange={(e) => setAlumnoField("cedulaEscolar", e.target.value)}
              placeholder="CE-000001" />
          </div>
          <div>
            <label className={labelCls}>Sexo *</label>
            <select className={inputCls} required value={alumno.sexo}
              onChange={(e) => setAlumnoField("sexo", e.target.value)}>
              <option value="">Seleccionar...</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Fecha de Nacimiento *</label>
            <input className={inputCls} type="date" required value={alumno.fechaNacimiento}
              onChange={(e) => setAlumnoField("fechaNacimiento", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Procedencia</label>
            <select className={inputCls} value={alumno.procedencia}
              onChange={(e) => setAlumnoField("procedencia", e.target.value)}>
              <option value="HOGAR">Hogar</option>
              <option value="MISMO_PLANTEL">Mismo plantel</option>
              <option value="OTRO_PLANTEL">Otro plantel</option>
            </select>
          </div>
          {alumno.procedencia === "OTRO_PLANTEL" && (
            <div className="md:col-span-2">
              <label className={labelCls}>Nombre del Plantel de Origen</label>
              <input className={inputCls} value={alumno.nombrePlantelOrigen}
                onChange={(e) => setAlumnoField("nombrePlantelOrigen", e.target.value)} />
            </div>
          )}
          <div>
            <label className={labelCls}>Municipio de Nacimiento</label>
            <input className={inputCls} value={alumno.municipioNacimiento}
              onChange={(e) => setAlumnoField("municipioNacimiento", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Estado de Nacimiento</label>
            <select className={inputCls} value={alumno.estadoNacimiento}
              onChange={(e) => setAlumnoField("estadoNacimiento", e.target.value)}>
              <option value="">Seleccionar...</option>
              {ESTADOS_VE.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Domicilio</label>
            <textarea className={inputCls} rows={2} value={alumno.domicilio}
              onChange={(e) => setAlumnoField("domicilio", e.target.value)}
              placeholder="Dirección completa del hogar" />
          </div>
          <div>
            <label className={labelCls}>Teléfono del Hogar</label>
            <input className={inputCls} value={alumno.telefonoHogar}
              onChange={(e) => setAlumnoField("telefonoHogar", e.target.value)}
              placeholder="0212-0000000" />
          </div>
        </div>
      </div>

      {/* Sección 2: Representantes */}
      <div className={sectionCls}>
        <h2 className="text-lg font-bold text-gray-900 mb-2">2. Datos del Representante</h2>
        <p className="text-sm text-gray-500 mb-4">Complete los datos de al menos un representante.</p>

        <div className="space-y-6">
          {/* Madre */}
          <div>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={includeMadre}
                onChange={(e) => setIncludeMadre(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              <span className="font-medium text-gray-700">Incluir datos de la Madre</span>
            </label>
            {includeMadre && <RepFields rep={madre} setter={setMadre} title="Madre" />}
          </div>

          <div className="border-t border-gray-100" />

          {/* Padre */}
          <div>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={includePadre}
                onChange={(e) => setIncludePadre(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              <span className="font-medium text-gray-700">Incluir datos del Padre</span>
            </label>
            {includePadre && <RepFields rep={padre} setter={setPadre} title="Padre" />}
          </div>
        </div>
      </div>

      {/* Sección 3: Autorizados para Retiro */}
      <div className={sectionCls}>
        <h2 className="text-lg font-bold text-gray-900 mb-2">3. Personas Autorizadas para el Retiro</h2>
        <p className="text-sm text-gray-500 mb-4">Personas autorizadas a retirar al estudiante además de los representantes.</p>
        <div className="space-y-4">
          {autorizados.map((a, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nombre completo {i + 1}</label>
                <input className={inputCls} value={a.nombre}
                  onChange={(e) => {
                    const next = [...autorizados];
                    next[i] = { ...next[i], nombre: e.target.value };
                    setAutorizados(next);
                  }} placeholder="Apellidos y Nombres" />
              </div>
              <div>
                <label className={labelCls}>Cédula {i + 1}</label>
                <input className={inputCls} value={a.cedula}
                  onChange={(e) => {
                    const next = [...autorizados];
                    next[i] = { ...next[i], cedula: e.target.value };
                    setAutorizados(next);
                  }} placeholder="V-00000000" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sección 4: Contactos de Emergencia */}
      <div className={sectionCls}>
        <h2 className="text-lg font-bold text-gray-900 mb-2">4. Contactos de Emergencia</h2>
        <p className="text-sm text-gray-500 mb-4">Al menos un contacto es obligatorio.</p>
        <div className="space-y-4">
          {contactos.map((c, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nombre {i + 1}{i === 0 ? " *" : ""}</label>
                <input className={inputCls} value={c.nombre}
                  onChange={(e) => {
                    const next = [...contactos];
                    next[i] = { ...next[i], nombre: e.target.value };
                    setContactos(next);
                  }} placeholder="Apellidos y Nombres" />
              </div>
              <div>
                <label className={labelCls}>Teléfono {i + 1}{i === 0 ? " *" : ""}</label>
                <input className={inputCls} value={c.telefono}
                  onChange={(e) => {
                    const next = [...contactos];
                    next[i] = { ...next[i], telefono: e.target.value };
                    setContactos(next);
                  }} placeholder="0414-0000000" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sección 5: Antecedentes de Salud */}
      <div className={sectionCls}>
        <h2 className="text-lg font-bold text-gray-900 mb-2">5. Antecedentes de Salud</h2>
        <p className="text-sm text-gray-500 mb-4">Información médica relevante del estudiante (opcional).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Enfermedad o Condición Actual</label>
            <textarea className={inputCls} rows={2} value={salud.enfermedadActual}
              onChange={(e) => setSalud((p) => ({ ...p, enfermedadActual: e.target.value }))}
              placeholder="Ej: Asma, Diabetes, etc." />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Tratamiento que recibe</label>
            <textarea className={inputCls} rows={2} value={salud.tratamiento}
              onChange={(e) => setSalud((p) => ({ ...p, tratamiento: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Alergias a medicamentos</label>
            <input className={inputCls} value={salud.alergiasMedicamentos}
              onChange={(e) => setSalud((p) => ({ ...p, alergiasMedicamentos: e.target.value }))}
              placeholder="Especifique medicamentos a los que es alérgico/a" />
          </div>
          <div>
            <label className={labelCls}>Medicamento para la fiebre</label>
            <input className={inputCls} value={salud.medicamentoFiebre}
              onChange={(e) => setSalud((p) => ({ ...p, medicamentoFiebre: e.target.value }))}
              placeholder="Ej: Ibuprofeno, Paracetamol" />
          </div>
          <div>
            <label className={labelCls}>Teléfono del Seguro de Salud</label>
            <input className={inputCls} value={salud.seguroSaludTelefono}
              onChange={(e) => setSalud((p) => ({ ...p, seguroSaludTelefono: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end pb-6">
        <button
          type="submit"
          disabled={isPending}
          className="w-full md:w-auto rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Enviando..." : "Enviar Formulario de Inscripción"}
        </button>
      </div>
    </form>
  );
}
