// Plantillas de Meta WhatsApp Flows prediseñadas para clínicas dentales.
// Esquema v7.1 — https://developers.facebook.com/docs/whatsapp/flows/reference/flowjson

export type FlowTemplate = {
  id:          string
  name:        string
  description: string
  category:    "LEAD_QUALIFICATION" | "APPOINTMENT_REQUEST" | "POST_VISIT_SURVEY" | "CUSTOM"
  screens:     object
}

export const DENTAL_FLOW_TEMPLATES: FlowTemplate[] = [
  // ── 1. Calificación de lead ───────────────────────────────────────────────
  {
    id:          "lead_qualification",
    name:        "Calificación de prospecto",
    description: "Recoge tratamiento de interés, urgencia y horario de contacto en 2 pantallas.",
    category:    "LEAD_QUALIFICATION",
    screens: {
      version: "7.1",
      screens: [
        {
          id:    "TRATAMIENTO",
          title: "¿Qué necesitas?",
          layout: {
            type:     "SingleColumnLayout",
            children: [
              { type: "TextHeading", text: "Cuéntanos sobre ti" },
              { type: "TextBody",    text: "En 2 minutos te conectamos con nuestro equipo dental." },
              {
                type:         "TextInput",
                label:        "Tu nombre completo",
                name:         "name",
                required:     true,
                "input-type": "text",
              },
              {
                type:     "RadioButtonsGroup",
                label:    "¿Qué tratamiento te interesa?",
                name:     "treatment",
                required: true,
                "data-source": [
                  { id: "ortodoncia",     title: "Ortodoncia / Brackets"   },
                  { id: "implantes",      title: "Implantes dentales"       },
                  { id: "blanqueamiento", title: "Blanqueamiento dental"    },
                  { id: "cirugia",        title: "Cirugía oral"             },
                  { id: "limpieza",       title: "Limpieza / Prevención"    },
                  { id: "urgencia",       title: "Urgencia / Tengo dolor"   },
                  { id: "otro",           title: "Otro tratamiento"         },
                ],
              },
              {
                type:     "RadioButtonsGroup",
                label:    "¿Qué tan urgente es?",
                name:     "urgency",
                required: true,
                "data-source": [
                  { id: "hoy",      title: "Hoy mismo / tengo dolor"     },
                  { id: "semana",   title: "Esta semana"                  },
                  { id: "mes",      title: "Este mes"                     },
                  { id: "sin_prisa",title: "Sin prisa, estoy explorando" },
                ],
              },
              {
                type:  "Footer",
                label: "Continuar",
                "on-click-action": {
                  name: "navigate",
                  next: { type: "screen", name: "CONTACTO" },
                  payload: {
                    name:      "${form.name}",
                    treatment: "${form.treatment}",
                    urgency:   "${form.urgency}",
                  },
                },
              },
            ],
          },
        },
        {
          id:       "CONTACTO",
          title:    "¿Cuándo te contactamos?",
          terminal: true,
          layout: {
            type:     "SingleColumnLayout",
            children: [
              { type: "TextHeading", text: "Casi listo" },
              { type: "TextBody",    text: "Elige el mejor horario para que te llamemos." },
              {
                type:     "RadioButtonsGroup",
                label:    "Mejor horario para contactarte",
                name:     "preferred_time",
                required: true,
                "data-source": [
                  { id: "manana",    title: "Mañana (8:00 – 12:00)"   },
                  { id: "tarde",     title: "Tarde (12:00 – 18:00)"   },
                  { id: "cualquiera",title: "Cualquier horario"        },
                ],
              },
              {
                type:          "TextArea",
                label:         "¿Algo más que debamos saber? (opcional)",
                name:          "notes",
                required:      false,
                "helper-text": "Ej: tengo seguro, soy paciente desde 2022…",
              },
              {
                type:  "Footer",
                label: "Enviar",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    name:           "${data.name}",
                    treatment:      "${data.treatment}",
                    urgency:        "${data.urgency}",
                    preferred_time: "${form.preferred_time}",
                    notes:          "${form.notes}",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },

  // ── 2. Solicitud de cita ──────────────────────────────────────────────────
  {
    id:          "appointment_request",
    name:        "Solicitar cita",
    description: "El paciente elige tipo de consulta, fecha y horario preferido sin salir de WhatsApp.",
    category:    "APPOINTMENT_REQUEST",
    screens: {
      version: "7.1",
      screens: [
        {
          id:       "CITA",
          title:    "Solicitar consulta",
          terminal: true,
          layout: {
            type:     "SingleColumnLayout",
            children: [
              { type: "TextHeading", text: "Agenda tu cita" },
              { type: "TextBody",    text: "Completa el formulario. Confirmaremos tu cita en breve por este chat." },
              {
                type:         "TextInput",
                label:        "Tu nombre completo",
                name:         "name",
                required:     true,
                "input-type": "text",
              },
              {
                type:     "RadioButtonsGroup",
                label:    "Tipo de consulta",
                name:     "consultation_type",
                required: true,
                "data-source": [
                  { id: "primera_vez",  title: "Primera consulta"    },
                  { id: "seguimiento",  title: "Seguimiento / Control"},
                  { id: "presupuesto",  title: "Cotizar tratamiento"  },
                  { id: "urgencia",     title: "Urgencia"             },
                ],
              },
              {
                type:     "DatePicker",
                label:    "Fecha preferida",
                name:     "preferred_date",
                required: true,
              },
              {
                type:     "RadioButtonsGroup",
                label:    "Horario preferido",
                name:     "preferred_time",
                required: true,
                "data-source": [
                  { id: "manana",   title: "Mañana (8:00 – 12:00)"    },
                  { id: "mediodia", title: "Mediodía (12:00 – 14:00)" },
                  { id: "tarde",    title: "Tarde (14:00 – 18:00)"    },
                ],
              },
              {
                type:     "TextArea",
                label:    "Motivo de la consulta (opcional)",
                name:     "reason",
                required: false,
              },
              {
                type:  "Footer",
                label: "Solicitar cita",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    name:              "${form.name}",
                    consultation_type: "${form.consultation_type}",
                    preferred_date:    "${form.preferred_date}",
                    preferred_time:    "${form.preferred_time}",
                    reason:            "${form.reason}",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },

  // ── 3. Encuesta post-consulta ─────────────────────────────────────────────
  {
    id:          "post_visit_survey",
    name:        "Encuesta de satisfacción",
    description: "Recopila NPS y comentarios después de la visita. 1 pantalla, 1 minuto.",
    category:    "POST_VISIT_SURVEY",
    screens: {
      version: "7.1",
      screens: [
        {
          id:       "ENCUESTA",
          title:    "Tu opinión importa",
          terminal: true,
          layout: {
            type:     "SingleColumnLayout",
            children: [
              { type: "TextHeading", text: "¿Cómo fue tu visita?" },
              { type: "TextBody",    text: "Tu opinión nos ayuda a mejorar. ¡Solo toma 1 minuto!" },
              {
                type:     "RadioButtonsGroup",
                label:    "¿Cómo calificarías tu experiencia?",
                name:     "rating",
                required: true,
                "data-source": [
                  { id: "5", title: "⭐⭐⭐⭐⭐ Excelente"  },
                  { id: "4", title: "⭐⭐⭐⭐ Muy buena"   },
                  { id: "3", title: "⭐⭐⭐ Buena"         },
                  { id: "2", title: "⭐⭐ Regular"         },
                  { id: "1", title: "⭐ Mala"              },
                ],
              },
              {
                type:     "RadioButtonsGroup",
                label:    "¿Recomendarías nuestra clínica?",
                name:     "would_recommend",
                required: true,
                "data-source": [
                  { id: "si",      title: "Sí, definitivamente" },
                  { id: "tal_vez", title: "Tal vez"             },
                  { id: "no",      title: "No"                  },
                ],
              },
              {
                type:     "TextArea",
                label:    "¿Tienes algún comentario? (opcional)",
                name:     "comment",
                required: false,
              },
              {
                type:  "Footer",
                label: "Enviar opinión",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    rating:           "${form.rating}",
                    would_recommend:  "${form.would_recommend}",
                    comment:          "${form.comment}",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
]
