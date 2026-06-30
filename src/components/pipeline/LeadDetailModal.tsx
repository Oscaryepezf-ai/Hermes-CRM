"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Clock, Phone, Mail, DollarSign, Sparkles } from "lucide-react";
import { getLeadHistory, convertLeadToPatient } from "@/lib/actions/leads";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { LeadWithStage } from "@/types";

const sourceLabels: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  GOOGLE: "Google",
  TIKTOK: "TikTok",
  WHATSAPP: "WhatsApp",
  REFERIDO: "Referido",
  OTRO: "Otro",
};

interface LeadDetailModalProps {
  lead: LeadWithStage;
  onClose: () => void;
}

export function LeadDetailModal({ lead, onClose }: LeadDetailModalProps) {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    getLeadHistory(lead.id).then((res) => {
      if (res.success) setHistory(res.data);
    });
  }, [lead.id]);

  const handleConvert = async () => {
    setConverting(true);
    const res = await convertLeadToPatient(lead.id);
    if (res.success) {
      toast.success("Lead convertido a paciente");
      onClose();
      router.refresh();
    } else {
      toast.error(res.error);
      setConverting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{lead.fullName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info básica */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              {lead.phone}
            </div>
            {lead.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                {lead.email}
              </div>
            )}
            {lead.estimatedValue && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                {formatCurrency(lead.estimatedValue, "USD")}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {lead.interest && (
              <Badge variant="secondary">{lead.interest}</Badge>
            )}
            <Badge variant="outline">
              {sourceLabels[lead.source] ?? lead.source}
            </Badge>
            {lead.convertedAt && (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                Convertido
              </Badge>
            )}
          </div>

          {lead.notes && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              {lead.notes}
            </p>
          )}

          <Separator />

          {/* Historial */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Historial del pipeline
            </h4>
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-2.5">
                  {h.user ? (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-indigo-700">
                        {h.user.name[0]}
                      </span>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      {h.fromStage ? (
                        <>
                          <span className="text-xs text-gray-500">{h.fromStage}</span>
                          <ArrowRight className="w-3 h-3 text-gray-300" />
                        </>
                      ) : null}
                      <span className="text-xs font-medium text-indigo-600">
                        {h.toStage}
                      </span>
                    </div>
                    {h.note && (
                      <p className="text-xs text-gray-500 mt-0.5">{h.note}</p>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5 text-gray-300" />
                      <span className="text-xs text-gray-400">
                        {h.user ? h.user.name : "Hermes IA"} · {formatDate(h.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones */}
          {!lead.convertedAt && (
            <>
              <Separator />
              <Button
                onClick={handleConvert}
                disabled={converting}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {converting ? "Convirtiendo..." : "Convertir a paciente"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
