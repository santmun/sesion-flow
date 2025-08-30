import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ChevronLeft, ChevronRight, Loader2, Video } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';

interface VideoResource {
  id: string;
  name: string;
  url: string;
}

interface FormData {
  nombre_paciente: string;
  edad: string;
  fecha_sesion: string;
  observaciones: string;
  recomendaciones: string;
  estado_emocional: string;
  videos_seleccionados: VideoResource[];
  nuevo_video: {
    nombre_video: string;
    enlace_video: string;
  };
  agregar_nuevo_video: boolean;
}

const INITIAL_FORM_DATA: FormData = {
  nombre_paciente: '',
  edad: '',
  fecha_sesion: '',
  observaciones: '',
  recomendaciones: '',
  estado_emocional: '',
  videos_seleccionados: [],
  nuevo_video: {
    nombre_video: '',
    enlace_video: ''
  },
  agregar_nuevo_video: false
};

const EMOTIONAL_STATES = [
  'Estable',
  'Ansioso',
  'Triste',
  'Alegre',
  'Otro'
];

export default function TherapyReportForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [availableVideos, setAvailableVideos] = useState<VideoResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  // Load form data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('therapy-form-data');
    if (savedData) {
      try {
        setFormData(JSON.parse(savedData));
      } catch (error) {
        console.error('Error loading saved form data:', error);
      }
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('therapy-form-data', JSON.stringify(formData));
  }, [formData]);

  // Fetch videos from Airtable
  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true);
      try {
        const AIRTABLE_API_KEY = 'patAsZcUxxbWni0tC.ceaf7a9af7556a89fc0b61139b22de1d7a0bfeaf1d4d24a23c7f7ec19738fab5';
        const BASE_ID = 'appNw4xrdZ0FHXmLN';
        const TABLE_ID = 'tblCENUOHskmVW6x0';
        
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          },
        });

        if (!response.ok) {
          throw new Error('Error al conectar con Airtable');
        }

        const data = await response.json();
        const videos: VideoResource[] = data.records.map((record: any) => ({
          id: record.id,
          name: record.fields['Nombre Video'] || 'Video sin nombre',
          url: record.fields['Enlace a Video'] || ''
        }));
        
        setAvailableVideos(videos);
      } catch (error) {
        console.error('Error fetching videos:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los videos. Intenta nuevamente.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [toast]);

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return formData.nombre_paciente.trim() !== '' && 
               formData.edad.trim() !== '' && 
               formData.fecha_sesion.trim() !== '';
      case 2:
        return formData.observaciones.trim() !== '' && 
               formData.recomendaciones.trim() !== '' && 
               formData.estado_emocional.trim() !== '';
      case 3:
        if (formData.agregar_nuevo_video) {
          return formData.nuevo_video.nombre_video.trim() !== '' && 
                 formData.nuevo_video.enlace_video.trim() !== '';
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    } else {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios.",
        variant: "destructive"
      });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleVideoSelection = (videoId: string) => {
    const video = availableVideos.find(v => v.id === videoId);
    if (video && !formData.videos_seleccionados.find(v => v.id === videoId)) {
      updateFormData('videos_seleccionados', [...formData.videos_seleccionados, video]);
    }
  };

  const removeSelectedVideo = (videoId: string) => {
    updateFormData('videos_seleccionados', 
      formData.videos_seleccionados.filter(v => v.id !== videoId)
    );
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) {
      toast({
        title: "Formulario incompleto",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        edad: parseInt(formData.edad),
        nuevo_video: formData.agregar_nuevo_video ? formData.nuevo_video : undefined
      };

      await axios.post(
        'https://n8n-n8n.p2pgyq.easypanel.host/webhook-test/4cca7c4f-390b-4e44-a523-f8b2ddd6051e',
        submitData
      );

      setIsSubmitted(true);
      localStorage.removeItem('therapy-form-data');
      
      toast({
        title: "✅ ¡Reporte enviado exitosamente!",
        description: "La información ha sido registrada correctamente.",
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error al enviar",
        description: "Hubo un problema al enviar el reporte. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1);
    setIsSubmitted(false);
    localStorage.removeItem('therapy-form-data');
  };

  const progress = (currentStep / 3) * 100;

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              ¡Reporte Enviado!
            </h2>
            <p className="text-muted-foreground mb-6">
              La información de la sesión ha sido registrada exitosamente.
            </p>
            <Button onClick={resetForm} className="w-full">
              Crear Nuevo Reporte
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Reporte Post-Sesión
          </h1>
          <p className="text-muted-foreground">
            Registra la información clínica relevante de la sesión
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground">
              Paso {currentStep} de 3
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% completado
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 1 && "Datos del Paciente"}
              {currentStep === 2 && "Detalles Clínicos"}
              {currentStep === 3 && "Recursos de Apoyo"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Patient Data */}
            {currentStep === 1 && (
              <div className="space-y-4 slide-enter">
                <div>
                  <Label htmlFor="nombre">Nombre del Paciente *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre_paciente}
                    onChange={(e) => updateFormData('nombre_paciente', e.target.value)}
                    placeholder="Ingresa el nombre completo"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edad">Edad *</Label>
                  <Input
                    id="edad"
                    type="number"
                    value={formData.edad}
                    onChange={(e) => updateFormData('edad', e.target.value)}
                    placeholder="Edad en años"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="fecha">Fecha de la Sesión *</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha_sesion}
                    onChange={(e) => updateFormData('fecha_sesion', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Clinical Details */}
            {currentStep === 2 && (
              <div className="space-y-4 slide-enter">
                <div>
                  <Label htmlFor="observaciones">Observaciones del Terapeuta *</Label>
                  <Textarea
                    id="observaciones"
                    value={formData.observaciones}
                    onChange={(e) => updateFormData('observaciones', e.target.value)}
                    placeholder="Describe las observaciones principales de la sesión..."
                    className="mt-1 min-h-[100px]"
                  />
                </div>
                <div>
                  <Label htmlFor="recomendaciones">Recomendaciones *</Label>
                  <Textarea
                    id="recomendaciones"
                    value={formData.recomendaciones}
                    onChange={(e) => updateFormData('recomendaciones', e.target.value)}
                    placeholder="Recomendaciones para el paciente..."
                    className="mt-1 min-h-[100px]"
                  />
                </div>
                <div>
                  <Label htmlFor="estado">Estado Emocional *</Label>
                  <Select
                    value={formData.estado_emocional}
                    onValueChange={(value) => updateFormData('estado_emocional', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecciona el estado emocional" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMOTIONAL_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Video Resources */}
            {currentStep === 3 && (
              <div className="space-y-6 slide-enter">
                <div>
                  <Label className="text-base font-medium">Videos de Apoyo Disponibles</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Selecciona videos que pueden ayudar al paciente
                  </p>
                  
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="ml-2 text-muted-foreground">Cargando videos...</span>
                    </div>
                  ) : (
                    <Select onValueChange={handleVideoSelection}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un video para agregar" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVideos
                          .filter(video => !formData.videos_seleccionados.find(v => v.id === video.id))
                          .map((video) => (
                            <SelectItem key={video.id} value={video.id}>
                              {video.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Selected Videos */}
                  {formData.videos_seleccionados.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium">Videos Seleccionados:</Label>
                      <div className="space-y-2 mt-2">
                        {formData.videos_seleccionados.map((video) => (
                          <div key={video.id} className="flex items-center justify-between bg-secondary p-3 rounded-md">
                            <div className="flex items-center gap-2">
                              <Video className="w-4 h-4 text-primary" />
                              <span className="text-sm">{video.name}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeSelectedVideo(video.id)}
                            >
                              Remover
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <input
                      type="checkbox"
                      id="nuevo-video"
                      checked={formData.agregar_nuevo_video}
                      onChange={(e) => updateFormData('agregar_nuevo_video', e.target.checked)}
                      className="rounded border-border"
                    />
                    <Label htmlFor="nuevo-video">¿Quieres agregar un nuevo video?</Label>
                  </div>

                  {formData.agregar_nuevo_video && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="nuevo-nombre">Nombre del Nuevo Video *</Label>
                        <Input
                          id="nuevo-nombre"
                          value={formData.nuevo_video.nombre_video}
                          onChange={(e) => updateFormData('nuevo_video', {
                            ...formData.nuevo_video,
                            nombre_video: e.target.value
                          })}
                          placeholder="Nombre descriptivo del video"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="nuevo-enlace">Enlace URL del Nuevo Video *</Label>
                        <Input
                          id="nuevo-enlace"
                          type="url"
                          value={formData.nuevo_video.enlace_video}
                          onChange={(e) => updateFormData('nuevo_video', {
                            ...formData.nuevo_video,
                            enlace_video: e.target.value
                          })}
                          placeholder="https://ejemplo.com/video"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>

              {currentStep < 3 ? (
                <Button
                  onClick={nextStep}
                  className="flex items-center gap-2"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Reporte'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}