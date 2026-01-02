import { ProjectWithRelations } from "@/types/projectSpecific";
import { EvilIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, ScrollView, TouchableOpacity, View } from "react-native";
import { FormInput } from "./formInput";
import { Body, BodyLarge, BodySmall } from "./typography";

interface pdfGenerationModalProps {
    visible: boolean;
    onCloseSimple: () => void;
    projectWithRelations: ProjectWithRelations;
    handlePdfGeneration: (type: "cleaning" | "cleaningWithPaymentReceipt", chimneyId?: string) => void;
}

export default function PdfGenerationModal({ 
    visible,
    onCloseSimple,
    projectWithRelations,
    handlePdfGeneration
  }: pdfGenerationModalProps ) {

    const [isGenerating, setIsGenerating] = useState(false);
    const [chimneySums, setChimneySums] = useState<Record<string, string[]>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);

    type PdfFlowStep =
    | "choice"         
    | "selectOne"       
    | "inputAll"        
    | "inputOne";       

    const [pdfStep, setPdfStep] = useState<PdfFlowStep>("choice");
    const [selectedChimneyId, setSelectedChimneyId] = useState<string | null>(null);
    

    const chimneyCount = useMemo(() =>{
        return projectWithRelations.objects.reduce((sum, o) => sum + o.chimneys.length, 0);
      },[projectWithRelations.objects]);
    
    const handleChimneySumChange = (chimneyId: string, index: number, value: string) => {
        setChimneySums((prev) => {
          const currentArray = prev[chimneyId] || ['', ''];
          const updatedArray = [...currentArray];
          updatedArray[index] = value;
          return {
            ...prev,
            [chimneyId]: updatedArray,
          };
        });
    };

    return(
        <Modal
            visible={visible}
              transparent
              animationType="slide"
              onRequestClose={onCloseSimple}
            >
              <View className="flex-1 bg-black/50 justify-center items-center">
                <View className="w-11/12 max-h-[90%] bg-dark-bg border border-gray-600 rounded-2xl overflow-hidden">

                  {/* Header */}
                  <View className="flex-row justify-end p-4 border-b border-gray-700">
                    <TouchableOpacity onPress={() => {
                      setPdfStep("choice");
                      setSelectedChimneyId(null);
                      setChimneySums({});
                      setFocusedField(null);
                      onCloseSimple();
                    }}>
                      <EvilIcons name="close" size={28} color="white" />
                    </TouchableOpacity>
                  </View>

                  {/* BODY */}
                  <View className="p-6 flex-2">

                    {/* ================= STEP 1 – CHOICE ================= */}
                    {pdfStep === "choice" && (
                      <View>
                        <BodyLarge className="text-white text-center text-lg mb-6">
                          Ako chcete vygenerovať PDF?
                        </BodyLarge>
                      
                        {/* NO RECEIPT */}
                        <TouchableOpacity
                          className="bg-gray-700 rounded-xl p-4 mb-4"
                          onPress={() => {
                            handlePdfGeneration("cleaning");
                            setPdfStep("choice");
                            setSelectedChimneyId(null);
                            setChimneySums({});
                            setFocusedField(null);
                          }}
                        >
                          <Body className="text-white text-center">
                            Len {chimneyCount > 1 ? "správy" : "správa"} (bez PPD)
                          </Body>
                        </TouchableOpacity>
                        
                        {/* ONE CHIMNEY */}
                        {chimneyCount > 1 && (
                          <TouchableOpacity
                            className="bg-gray-700 rounded-xl p-4 mb-4"
                            onPress={() => setPdfStep("selectOne")}
                          >
                            <Body className="text-white text-center">
                              Správa + PPD pre jeden komín
                            </Body>
                          </TouchableOpacity>
                        )}

                        {/* ALL CHIMNEYS */}
                        <TouchableOpacity
                          className="bg-blue-600 rounded-xl p-4"
                          onPress={() => setPdfStep("inputAll")}
                        >
                          <Body className="text-white text-center font-semibold">
                          {chimneyCount > 1 ? "Správy + PPD pre všetky komíny" : "Správa + PPD"}
                          </Body>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* ================= STEP 2 – SELECT ONE ================= */}
                    {pdfStep === "selectOne" && (
                      <ScrollView>
                        <BodyLarge className="text-white text-lg mb-4">
                          Vyberte komín
                        </BodyLarge>
                    
                        {projectWithRelations.objects.map(o =>
                          o.chimneys.map(ch => (
                            <TouchableOpacity
                              key={ch.id}
                              className="bg-dark-details-o_p_bg rounded-xl p-4 mb-3"
                              onPress={() => {
                                setSelectedChimneyId(ch.id);
                                setPdfStep("inputOne");
                              }}
                            >
                              <Body className="text-white font-semibold">
                              {(ch as any).type} – {(ch as any).labelling}
                              </Body>
                              <BodySmall className="text-gray-400 text-sm">
                                {o.object.address}
                              </BodySmall>
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    )}

                    {/* ================= STEP 3A – INPUT ONE ================= */}
                    {pdfStep === "inputOne" && selectedChimneyId && (
                      <View>
                        <FormInput
                          label="Suma (€)"
                          value={chimneySums[selectedChimneyId]?.[0] || ""}
                          onChange={(v: string) =>
                            handleChimneySumChange(selectedChimneyId, 0, v)
                          }
                          fieldName="sum-one"
                          keyboardType="phone-pad"
                          focusedField={focusedField}
                          setFocusedField={setFocusedField}
                        />
                        <FormInput
                          label="Suma slovom"
                          value={chimneySums[selectedChimneyId]?.[1] || ""}
                          onChange={(v: string) =>
                            handleChimneySumChange(selectedChimneyId, 1, v)
                          }
                          fieldName="sum-one-words"
                          focusedField={focusedField}
                          setFocusedField={setFocusedField}
                        />
                        <TouchableOpacity
                          className="bg-blue-600 rounded-xl p-4 mt-6"
                          disabled={isGenerating}
                          onPress={() => {
                            handlePdfGeneration("cleaningWithPaymentReceipt", selectedChimneyId)
                            setPdfStep("choice");
                            setSelectedChimneyId(null);
                            setChimneySums({});
                            setFocusedField(null);
                          }}
                        >
                          <Body className="text-white text-center font-semibold">
                            {isGenerating ? "Generujem..." : "Generovať"}
                          </Body>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* ================= STEP 3B – INPUT ALL ================= */}
                    {pdfStep === "inputAll" && (
                      <ScrollView>
                        {projectWithRelations.objects.flatMap(o =>
                          o.chimneys.map(ch => (
                            <View
                              key={ch.id}
                              className="bg-dark-details-o_p_bg rounded-xl p-4 mb-4"
                            >
                              <Body className="text-white font-semibold">
                              {(ch as any).type} – {(ch as any).labelling}
                              </Body>
                              <BodySmall className="text-gray-400 text-sm mb-2">
                                {o.object.address}
                              </BodySmall>
                          
                              <FormInput
                                label="Suma (€)"
                                value={chimneySums[ch.id]?.[0] || ""}
                                onChange={(v: string) =>
                                  handleChimneySumChange(ch.id, 0, v)
                                }
                                fieldName={`sum-${ch.id}`}
                                keyboardType="phone-pad"
                                focusedField={focusedField}
                                setFocusedField={setFocusedField}
                              />

                              <FormInput
                                label="Suma slovom"
                                value={chimneySums[ch.id]?.[1] || ""}
                                onChange={(v: string) =>
                                  handleChimneySumChange(ch.id, 1, v)
                                }
                                fieldName={`sum-words-${ch.id}`}
                                focusedField={focusedField}
                                setFocusedField={setFocusedField}
                              />
                            </View>
                          ))
                        )}

                        <TouchableOpacity
                          className="bg-blue-600 rounded-xl p-4 mt-4"
                          disabled={isGenerating}
                          onPress={() => {
                            handlePdfGeneration("cleaningWithPaymentReceipt");
                            setPdfStep("choice");
                            setSelectedChimneyId(null);
                            setChimneySums({});
                            setFocusedField(null);
                          }}
                        >
                          <Body className="text-white text-center font-semibold">
                            {isGenerating ? "Generujem..." : "Generovať všetky"}
                          </Body>
                        </TouchableOpacity>
                      </ScrollView>
                    )}
                  </View>
                </View>
              </View>
            </Modal>
)}