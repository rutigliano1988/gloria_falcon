"use client";

import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { calcularEdad } from "@/lib/utils";

// Campos compartidos entre la ficha de inscripción y la edición del alumno.

export const ESTADOS_VE = [
  "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar", "Carabobo",
  "Cojedes", "Delta Amacuro", "Distrito Capital", "Falcón", "Guárico", "Lara",
  "Mérida", "Miranda", "Monagas", "Nueva Esparta", "Portuguesa", "Sucre",
  "Táchira", "Trujillo", "La Guaira", "Yaracuy", "Zulia",
];

export const TIPO_REPRESENTANTE_LABELS = { MADRE: "Madre", PADRE: "Padre", TUTOR: "Tutor" } as const;

export type RepresentanteCamposValor = {
  apellidosNombres: string;
  fechaNacimiento: string;
  cedula: string;
  telefonoHab: string;
  telefonoCelular: string;
  ocupacion: string;
  telefonoOficina: string;
  email: string;
};

export const representanteVacio = (): RepresentanteCamposValor => ({
  apellidosNombres: "", fechaNacimiento: "", cedula: "", telefonoHab: "",
  telefonoCelular: "", ocupacion: "", telefonoOficina: "", email: "",
});

export function RepresentanteCampos({
  valor,
  onChange,
  fechaObligatoria = false,
}: {
  valor: RepresentanteCamposValor;
  onChange: (v: RepresentanteCamposValor) => void;
  fechaObligatoria?: boolean;
}) {
  const campo = (k: keyof RepresentanteCamposValor) => ({
    value: valor[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...valor, [k]: e.target.value }),
  });
  const edad = valor.fechaNacimiento ? calcularEdad(new Date(valor.fechaNacimiento)) : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label>Apellidos y Nombres</Label>
        <Input {...campo("apellidosNombres")} />
      </div>
      <div>
        <Label>C.I.</Label>
        <Input {...campo("cedula")} />
      </div>
      <div>
        <Label>
          Fecha de Nacimiento {fechaObligatoria && valor.apellidosNombres && <span className="text-destructive">*</span>}
        </Label>
        <DatePicker value={valor.fechaNacimiento} onChange={(v) => onChange({ ...valor, fechaNacimiento: v })} />
        {edad !== null && <p className="text-xs text-muted-foreground mt-1">Edad: {edad} años</p>}
      </div>
      <div>
        <Label>Teléfono de Habitación</Label>
        <Input {...campo("telefonoHab")} />
      </div>
      <div>
        <Label>Teléfono Celular</Label>
        <Input {...campo("telefonoCelular")} />
      </div>
      <div>
        <Label>Ocupación</Label>
        <Input {...campo("ocupacion")} />
      </div>
      <div>
        <Label>Teléfono de Oficina</Label>
        <Input {...campo("telefonoOficina")} />
      </div>
      <div>
        <Label>Correo Electrónico</Label>
        <Input type="email" {...campo("email")} />
      </div>
    </div>
  );
}
