export interface NotificacionResumen {
  idNotificacion: number;
  codigoEvento: string;
  tituloNotificacion: string;
  mensajeNotificacion: string;
  estadoNotificacion: string;
  fechaEnvio: string;
  fechaLectura: string | null;
  referenciaNegocio: string | null;
}

export interface NotificacionDetalle {
  idNotificacion: number;
  codigoEvento: string;
  tituloNotificacion: string;
  mensajeNotificacion: string;
  estadoNotificacion: string;
  fechaEnvio: string;
  fechaLectura: string | null;
  referenciaNegocio: string | null;
  codigoPlantilla: string;
  nombrePlantilla: string;
  nombreCanal: string;
}
