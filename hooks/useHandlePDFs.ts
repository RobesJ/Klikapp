import { getFooterImageBase64, getWatermarkBase64 } from "@/constants/icons";
import { supabase } from "@/lib/supabase";
import { generateRecord } from "@/services/pdfService";
import { useNotificationStore } from "@/store/notificationStore";
import { PDF, User } from "@/types/generics";
import { Chimney, ObjectWithRelations } from "@/types/objectSpecific";
import { ProjectWithRelations } from "@/types/projectSpecific";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

interface UseHandlePDFsProps {
    projectWithRelations: ProjectWithRelations;
    users: User[]
}

export function useHandlePDFs({projectWithRelations, users}: UseHandlePDFsProps){
    const projectRef = useRef(projectWithRelations);
    const usersRef = useRef(users);

    const [uploadingPDFs, setUploadingPDFs] = useState(false);
    const [loadingPDFs, setLoadingPDFs] = useState(false);
    const [generatingPDFs, setGeneratingPDFs] = useState(false);
    const [selectedPDF, setSelectedPDF] = useState<PDF | null>();
    const [chimneySums, setChimneySums] = useState<Record<string, string[]>>({});
    const [PDFs, setPDFs] = useState<PDF[]>([]);

    useEffect(() => {
        projectRef.current = projectWithRelations;
        usersRef.current = users;
    }, [projectWithRelations, users]);
  
    const fetchPDFs = useCallback(async () => {
        setLoadingPDFs(true);
        try{
            const {data, error} = await supabase
                .from("pdfs")
                .select('*')
                .eq("project_id", projectRef.current.project.id)
                .order("generated_at", {ascending: false});
            
            if (error) throw error;
            setPDFs(data || []);
        }
        catch(error: any){
            console.log("Error fetching PDFs:", error);
        }
        finally{
            setLoadingPDFs(false);
        }
    }, []);
    
    const generateFile = async (
        type: "cleaning" | "inspection" | "cleaningWithPaymentReceipt",
        object: ObjectWithRelations,
        chimney: Chimney,
        watermarkBase64: string,
        footerBase64: string,
        sums: string[] | null
    ) => {
        try {
            const uri = await generateRecord(
                projectRef.current.project,
                usersRef.current[0],
                projectRef.current.client,
                object,
                chimney,
                watermarkBase64,
                footerBase64,
                type,
                sums
            );
        
            if (uri) {
                await uploadPDF(
                    uri,
                    projectRef.current.project.id,
                    type,
                    object.object.id,
                    chimney,
                    sums
                );
            }
        } 
        catch (err) {
            console.error("Failed uploading or generation of cleaning record", err);
        }    
    }

    const handleGeneratePDF = useCallback(async (
        type: "cleaning" | "inspection" | "cleaningWithPaymentReceipt",
        receiptOnlyForChimneyId?: string
    ) => {
        try {
          setGeneratingPDFs(true);
        
          const watermarkBase64 = await getWatermarkBase64();
          const footerBase64 = await getFooterImageBase64();
        
          /* ----------------------------------------------------
             RECEIPT LOGIC
             ---------------------------------------------------- */
            if (type === "cleaningWithPaymentReceipt") {
              // ALL chimneys → receipt for all
              if (!receiptOnlyForChimneyId) {
                console.log("inside of generate amount for all condition");
                for (const object of projectRef.current.objects) {
                  for (const chimney of object.chimneys) {
                    const sums = chimneySums[chimney.id] || ["", ""];
                    // console.log(sums);
                    generateFile(type, object, chimney, watermarkBase64, footerBase64, sums);
                  }
                }
              }
        
              // ONE chimney → receipt only for selected
              else {
                  for (const object of projectRef.current.objects) {
                      for (const chimney of object.chimneys) {
                          const theOneChimney = chimney.id === receiptOnlyForChimneyId ? chimney : null;
                      
                          if (theOneChimney){
                              const sums = chimneySums[theOneChimney.id];
                              generateFile(type, object, theOneChimney, watermarkBase64, footerBase64, sums);
                          }
                          else{
                              generateFile("cleaning", object, chimney, watermarkBase64, footerBase64, null);
                          }
                      }
                  }
              }
          }
      
          else {
            for (const object of projectRef.current.objects) {
              for (const chimney of object.chimneys) {
                generateFile(type, object, chimney, watermarkBase64, footerBase64, null);
              }
            }
          }
          useNotificationStore.getState().addNotification(
            "PDF dokumenty boli vygenerované",
            "success",
            3000
          );
        } 
        catch (error) {
            console.error("handleGeneratePDF failed:", error);
            useNotificationStore.getState().addNotification(
                "Nepodarilo sa vygenerovať PDF",
                "error",
                3000
            );
        } 
        finally {
            setGeneratingPDFs(false);
            setChimneySums({});
        }
    },[chimneySums]);

    const uploadPDF = async (uri: string | null, projectId: string, report_type: string, objectId: string, chimney: Chimney, sums: string[] | null) => {
        if (uri === null) return;

        setUploadingPDFs(true);
        try {
            const filename = report_type === "cleaning" ||  report_type === "cleaningWithPaymentReceipt"
                ? `cleaning_${chimney.id}_${projectId}.pdf`
                : `inspection_${chimney.id}_${projectId}.pdf`;
            

            const response = await fetch(uri);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();
      
            // Upload to Supabase Storage
            const { error: uploadError } = await supabase
                .storage
                .from("pdf-reports")
                .upload(filename, arrayBuffer, {
                    contentType: 'application/pdf',
                    upsert: false,
                });

            if (uploadError) throw uploadError;
        
            // Get public URL
            const { data: urlData } = supabase.storage
                .from("pdf-reports")
                .getPublicUrl(filename);
                
            console.log(`PDF for chimney ${chimney.id} uploaded`);
        
            // Save to database
            const insertData = { 
                project_id: projectId,
                object_id: objectId,
                chimney_id: chimney.id,
                report_type: report_type,
                file_name: filename,
                file_size: blob.size,
                file_type: blob.type.toString(),
                storage_path: urlData.publicUrl,
                ...(sums && { amount: sums[0], amountByWords: sums[1] })
            };  
           
            const { data: pdfData, error: dbError } = await supabase
                .from("pdfs")
                .insert(insertData)
                .select()
                .single();

            if (dbError) throw dbError;
            // Update local state
            setPDFs(prev => [pdfData, ...prev]);
            
            useNotificationStore.getState().addNotification(
                "PDF záznam bol pridaný",
                "success",
                3000
            );
        } 
        catch (error: any) {
            console.error('Error uploading pdf', error);
            useNotificationStore.getState().addNotification(
                "Nepodarilo sa nahrať PDF",
                "error",
                4000
            );
        } 
        finally {
            setUploadingPDFs(false);
        }
    };

    const deletePdf = useCallback(async (pdf: PDF) => {
        const parts = pdf.storage_path.split("pdf-reports/");
        const filename = parts[1];

        Alert.alert(
            'Odstrániť PDF',
            'Naozaj chcete odstrániť tento PDF záznam?',
            [
                { text: 'Zrušiť', style: 'cancel' },
                {
                    text: 'Odstrániť',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Delete from storage
                            const { error: storageError } = await supabase.storage
                                .from("pdf-reports")
                                .remove([filename]);

                            if (storageError) throw storageError;

                            // Delete from database
                            const { error: dbError } = await supabase
                                .from("pdfs")
                                .delete()
                                .eq('id', pdf.id);

                            if (dbError) throw dbError;

                            // Update local state
                            setPDFs(prev => prev.filter(p => p.id !== pdf.id));
                            setSelectedPDF(null);
                            useNotificationStore.getState().addNotification(
                              "PDF záznam bol odstránený",
                              "success",
                              3000
                            );
                        } 
                        catch (error: any) {
                            console.error('Error deleting pdf:', error);
                            useNotificationStore.getState().addNotification(
                                "Nepodarilo sa odstrániť PDF záznam",
                                "error",
                                4000
                            );
                        }
                    }
                }
            ]
        );
    }, []);

    return {
        uploadingPDFs,
        loadingPDFs,
        generatingPDFs,
        selectedPDF,
        chimneySums,
        PDFs,

        setUploadingPDFs,
        setLoadingPDFs,
        setGeneratingPDFs,
        setSelectedPDF,
        setChimneySums,
        setPDFs,

        handleGeneratePDF,
        fetchPDFs,
        deletePdf
    };
}