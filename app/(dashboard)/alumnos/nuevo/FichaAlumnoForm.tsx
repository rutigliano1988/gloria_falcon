"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { crearAlumno, type AlumnoFormData } from "../actions";
import { useToast } from "@/hooks/use-toast";
import { calcularEdad, parsePrismaError } from "@/lib/utils";
import type { Grado, Seccion, AnoEscolar } from "@prisma/client";

type GradoConSecciones = Grado & { secciones: Seccion[] };

interface Props {
  grados: GradoConSecciones[];
  anos: AnoEscolar[];
}

const SERVICIOS = [
  { valor: "ALMUERZO", label: "Almuerzo" },
  { valor: "RESGUARDO", label: "Resguardo" },
  { valor: "TAE_KWON_DO", label: "Tae-Kwon-Do" },
];

const ESTADOS_VE = [
  "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar", "Carabobo",
  "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón", "Guárico", "Lara",
  "Mérida", "Miranda", "Monagas", "Nueva Esparta", "Portuguesa", "Sucre",
  "Táchira", "Trujillo", "La Guaira", "Yaracuy", "Zulia",
];

const defaultContacto = { nombre: "", telefono: "" };

export function FichaAlumnoForm({ grados, anos }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Datos personales
  const [form, setForm] = useState({
    primerApellido: "",
    segundoApellido: "",
    primerNombre: "",
    segundoNombre: "",
    cedulaEscolar: "",
    municipioNacimiento: "",
    estadoNacimiento: "",
    sexo: "" as "M" | "F" | "",
    fechaNacimiento: "",
    domicilio: "",
    telefonoHogar: "",
    procedencia: "HOGAR" as "HOGAR" | "MISMO_PLANTEL" | "OTRO_PLANTEL",
    nombrePlantelOrigen: "",
    // Salud
    enfermedadActual: "",
    tratamiento: "",
    alergiasMedicamentos: "",
    medicamentoFiebre: "",
    seguroSaludTelefono: "",
    // Autorizados
    autorizado1Nombre: "",
    autorizado1Cedula: "",
    autorizado2Nombre: "",
    autorizado2Cedula: "",
    // Inscripción
    anoEscolarId: "",
    gradoId: "",
    seccionId: "",
    descuentoMontoUsd: "",
    descuentoObservacion: "",
  });

  const [madre, setMadre] = useState({
    apellidosNombres: "", fechaNacimiento: "", cedula: "", telefonoHab: "",
    telefonoCelular: "", ocupacion: "", telefonoOficina: "", email: "",
  });
  const [padre, setPadre] = useState({
    apellidosNombres: "", fechaNacimiento: "", cedula: "", telefonoHab: "",
    telefonoCelular: "", ocupacion: "", telefonoOficina: "", email: "",
  });
  const [contactos, setContactos] = useState([
    { ...defaultContacto }, { ...defaultContacto }, { ...defaultContacto },
  ]);
  const [servicios, setServicios] = useState<string[]>([]);

  const gradoSeleccionado = grados.find((g) => g.id === form.gradoId);
  const edad = form.fechaNacimiento ? calcularEdad(new Date(form.fechaNacimiento)) : null;
  const edadMadre = madre.fechaNacimiento ? calcularEdad(new Date(madre.fechaNacimiento)) : null;
  const edadPadre = padre.fechaNacimiento ? calcularEdad(new Date(padre.fechaNacimiento)) : null;

  const toggleServicio = (valor: string) => {
    setServicios((prev) =>
      prev.includes(valor) ? prev.filter((s) => s !== valor) : [...prev, valor]
    );
  };

  const handleSubmit = async () => {
    if (!form.primerApellido || !form.primerNombre || !form.sexo || !form.fechaNacimiento || !form.anoEscolarId || !form.gradoId) {
      toast({ title: "Campos obligatorios", description: "Completa los campos marcados con *", variant: "destructive" });
      return;
    }
    if (madre.apellidosNombres && !madre.fechaNacimiento) {
      toast({ title: "Datos de la Madre incompletos", description: "Ingresa la fecha de nacimiento de la madre", variant: "destructive" });
      return;
    }
    if (padre.apellidosNombres && !padre.fechaNacimiento) {
      toast({ title: "Datos del Padre incompletos", description: "Ingresa la fecha de nacimiento del padre", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data: AlumnoFormData = {
        ...form,
        sexo: form.sexo as "M" | "F",
        descuentoMontoUsd: form.descuentoMontoUsd ? parseFloat(form.descuentoMontoUsd) : null,
        madre: madre.apellidosNombres ? { tipo: "MADRE", ...madre, email: madre.email || null } : null,
        padre: padre.apellidosNombres ? { tipo: "PADRE", ...padre, email: padre.email || null } : null,
        contactos: contactos.filter((c) => c.nombre),
        servicios: servicios as ("ALMUERZO" | "RESGUARDO" | "TAE_KWON_DO")[],
        seccionId: form.seccionId || null,
        cedulaEscolar: form.cedulaEscolar || null,
      };
      await crearAlumno(data);
      toast({ title: "Alumno inscrito exitosamente" });
      router.push("/alumnos");
    } catch (e: unknown) {
      toast({ title: "Error", description: parsePrismaError(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const f = (field: keyof typeof form) => ({
    value: form[field] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [field]: e.target.value }),
  });

  return (
    <div className="space-y-6">
      {/* ─── Inscripción ─── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Inscripción *</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Año Escolar *</Label>
            <Select value={form.anoEscolarId} onValueChange={(v) => setForm({ ...form, anoEscolarId: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {anos.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nombre} {a.activo ? "(Activo)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Grado *</Label>
            <Select value={form.gradoId} onValueChange={(v) => setForm({ ...form, gradoId: v, seccionId: "" })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {grados.map((g) => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sección</Label>
            <Select value={form.seccionId} onValueChange={(v) => setForm({ ...form, seccionId: v })} disabled={!gradoSeleccionado}>
              <SelectTrigger><SelectValue placeholder="Sección (opcional)" /></SelectTrigger>
              <SelectContent>
                {gradoSeleccionado?.secciones.map((s) => (
                  <SelectItem key={s.id} value={s.id}>Sección {s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descuento / Beca ($)</Label>
            <Input type="number" step="0.01" placeholder="0.00" {...f("descuentoMontoUsd")} />
          </div>
          <div className="sm:col-span-2">
            <Label>Observación del descuento</Label>
            <Input placeholder="Motivo del descuento..." {...f("descuentoObservacion")} />
          </div>
          <div className="sm:col-span-3">
            <Label>Servicios suscritos</Label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {SERVICIOS.map((s) => (
                <button
                  key={s.valor}
                  type="button"
                  onClick={() => toggleServicio(s.valor)}
                  className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                    servicios.includes(s.valor)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white border-input hover:bg-gray-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Datos Personales ─── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Datos Personales del Alumno</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Primer Apellido *</Label>
              <Input {...f("primerApellido")} />
            </div>
            <div>
              <Label>Segundo Apellido</Label>
              <Input {...f("segundoApellido")} />
            </div>
            <div>
              <Label>Primer Nombre *</Label>
              <Input {...f("primerNombre")} />
            </div>
            <div>
              <Label>Segundo Nombre</Label>
              <Input {...f("segundoNombre")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label>Cédula Escolar</Label>
              <Input placeholder="Asignado por el plantel" {...f("cedulaEscolar")} />
            </div>
            <div>
              <Label>Sexo *</Label>
              <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v as "M" | "F" })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha de Nacimiento * <span className="text-xs font-normal text-muted-foreground">(dd/mm/aaaa)</span></Label>
              <DatePicker value={form.fechaNacimiento} onChange={(v) => setForm({ ...form, fechaNacimiento: v })} />
              {edad !== null && (
                <p className="text-xs text-muted-foreground mt-1">Edad: {edad} años</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Municipio de Nacimiento</Label>
              <Input {...f("municipioNacimiento")} />
            </div>
            <div>
              <Label>Estado / Entidad Federal</Label>
              <Select value={form.estadoNacimiento} onValueChange={(v) => setForm({ ...form, estadoNacimiento: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_VE.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Domicilio</Label>
              <Textarea rows={2} {...f("domicilio")} />
            </div>
            <div>
              <Label>Teléfono del Hogar</Label>
              <Input {...f("telefonoHogar")} />
            </div>
          </div>

          <div>
            <Label>Procedencia</Label>
            <Select value={form.procedencia} onValueChange={(v) => setForm({ ...form, procedencia: v as typeof form.procedencia })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HOGAR">Hogar</SelectItem>
                <SelectItem value="MISMO_PLANTEL">Mismo plantel</SelectItem>
                <SelectItem value="OTRO_PLANTEL">Otro plantel</SelectItem>
              </SelectContent>
            </Select>
            {form.procedencia === "OTRO_PLANTEL" && (
              <Input className="mt-2" placeholder="Nombre del plantel de origen" {...f("nombrePlantelOrigen")} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Datos de la Madre ─── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Datos de la Madre</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Apellidos y Nombres</Label>
            <Input value={madre.apellidosNombres} onChange={(e) => setMadre({ ...madre, apellidosNombres: e.target.value })} />
          </div>
          <div>
            <Label>C.I.</Label>
            <Input value={madre.cedula} onChange={(e) => setMadre({ ...madre, cedula: e.target.value })} />
          </div>
          <div>
            <Label>Fecha de Nacimiento {madre.apellidosNombres && <span className="text-destructive">*</span>}</Label>
            <DatePicker value={madre.fechaNacimiento} onChange={(v) => setMadre({ ...madre, fechaNacimiento: v })} />
            {edadMadre !== null && <p className="text-xs text-muted-foreground mt-1">Edad: {edadMadre} años</p>}
          </div>
          <div>
            <Label>Teléfono de Habitación</Label>
            <Input value={madre.telefonoHab} onChange={(e) => setMadre({ ...madre, telefonoHab: e.target.value })} />
          </div>
          <div>
            <Label>Teléfono Celular</Label>
            <Input value={madre.telefonoCelular} onChange={(e) => setMadre({ ...madre, telefonoCelular: e.target.value })} />
          </div>
          <div>
            <Label>Ocupación</Label>
            <Input value={madre.ocupacion} onChange={(e) => setMadre({ ...madre, ocupacion: e.target.value })} />
          </div>
          <div>
            <Label>Teléfono de Oficina</Label>
            <Input value={madre.telefonoOficina} onChange={(e) => setMadre({ ...madre, telefonoOficina: e.target.value })} />
          </div>
          <div>
            <Label>Correo Electrónico</Label>
            <Input type="email" value={madre.email} onChange={(e) => setMadre({ ...madre, email: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* ─── Datos del Padre ─── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Datos del Padre</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Apellidos y Nombres</Label>
            <Input value={padre.apellidosNombres} onChange={(e) => setPadre({ ...padre, apellidosNombres: e.target.value })} />
          </div>
          <div>
            <Label>C.I.</Label>
            <Input value={padre.cedula} onChange={(e) => setPadre({ ...padre, cedula: e.target.value })} />
          </div>
          <div>
            <Label>Fecha de Nacimiento {padre.apellidosNombres && <span className="text-destructive">*</span>}</Label>
            <DatePicker value={padre.fechaNacimiento} onChange={(v) => setPadre({ ...padre, fechaNacimiento: v })} />
            {edadPadre !== null && <p className="text-xs text-muted-foreground mt-1">Edad: {edadPadre} años</p>}
          </div>
          <div>
            <Label>Teléfono de Habitación</Label>
            <Input value={padre.telefonoHab} onChange={(e) => setPadre({ ...padre, telefonoHab: e.target.value })} />
          </div>
          <div>
            <Label>Teléfono Celular</Label>
            <Input value={padre.telefonoCelular} onChange={(e) => setPadre({ ...padre, telefonoCelular: e.target.value })} />
          </div>
          <div>
            <Label>Ocupación</Label>
            <Input value={padre.ocupacion} onChange={(e) => setPadre({ ...padre, ocupacion: e.target.value })} />
          </div>
          <div>
            <Label>Teléfono de Oficina</Label>
            <Input value={padre.telefonoOficina} onChange={(e) => setPadre({ ...padre, telefonoOficina: e.target.value })} />
          </div>
          <div>
            <Label>Correo Electrónico</Label>
            <Input type="email" value={padre.email} onChange={(e) => setPadre({ ...padre, email: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* ─── Personas autorizadas para retiro ─── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Personas Autorizadas para Retiro</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Persona 1 — Nombre completo</Label>
              <Input {...f("autorizado1Nombre")} />
            </div>
            <div>
              <Label>Persona 1 — C.I.</Label>
              <Input {...f("autorizado1Cedula")} />
            </div>
            <div>
              <Label>Persona 2 — Nombre completo</Label>
              <Input {...f("autorizado2Nombre")} />
            </div>
            <div>
              <Label>Persona 2 — C.I.</Label>
              <Input {...f("autorizado2Cedula")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Antecedentes de Salud ─── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Antecedentes de Salud</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>¿Padece alguna enfermedad?</Label>
            <Textarea rows={2} placeholder="Describa la enfermedad..." {...f("enfermedadActual")} />
          </div>
          <div>
            <Label>Tratamiento actual</Label>
            <Input {...f("tratamiento")} />
          </div>
          <div>
            <Label>¿Alérgico a algún medicamento?</Label>
            <Input {...f("alergiasMedicamentos")} />
          </div>
          <div>
            <Label>Medicamento a suministrar en caso de fiebre/dolor</Label>
            <Input {...f("medicamentoFiebre")} />
          </div>
          <div>
            <Label>Teléfono de emergencia del seguro de salud</Label>
            <Input {...f("seguroSaludTelefono")} />
          </div>

          <Separator />
          <p className="text-sm font-medium">Contactos de Emergencia</p>
          {contactos.map((c, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Contacto {i + 1} — Nombre</Label>
                <Input
                  value={c.nombre}
                  onChange={(e) => {
                    const copy = [...contactos];
                    copy[i] = { ...copy[i], nombre: e.target.value };
                    setContactos(copy);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">Teléfono</Label>
                <Input
                  value={c.telefono}
                  onChange={(e) => {
                    const copy = [...contactos];
                    copy[i] = { ...copy[i], telefono: e.target.value };
                    setContactos(copy);
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ─── Checklist Documental ─── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Requisitos Documentales</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Checklist visual — marcar los documentos recibidos:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              "3 fotos del alumno (frente, carnet, actualizada)",
              "1 foto del representante",
              "Fotocopia Partida de Nacimiento",
              "Fotocopia Cédula del Alumno (obligatorio 4º grado en adelante)",
              "Fotocopia Cédula del Representante",
              "Fotocopia Certificado de Vacunación",
              "Fotocopia Boletín último lapso cursado",
              "Fotocopia Certificado de Promoción (indispensable)",
            ].map((doc) => (
              <label key={doc} className="flex items-start gap-2 cursor-pointer text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300" />
                <span>{doc}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            * Este checklist es informativo. No se guarda en el sistema.
          </p>
        </CardContent>
      </Card>

      {/* ─── Botones ─── */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Guardando..." : "Inscribir Alumno"}
        </Button>
      </div>
    </div>
  );
}
