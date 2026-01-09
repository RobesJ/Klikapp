import { getFooterImageBase64, getWatermarkBase64 } from "@/constants/icons";
import { supabase } from "@/lib/supabase";
import { generateRecord } from "@/services/pdfService";
import { PDF, User } from "@/types/generics";
import { Chimney, ChimneyType, ObjectWithRelations } from "@/types/objectSpecific";
import { ProjectWithRelations } from "@/types/projectSpecific";
import { Alert } from "react-native";

export async function regeneratePDFUtil(pdf: PDF){
    console.log("regeneration called");
    try {
        // fetch and transform data needed for generation
        const {data, error: projectError } = await supabase
            .from("projects")
            .select(`
                *,
                clients (*),
                project_assignments (
                  user_profiles (id, name, email)
                ),
                project_objects (
                  objects (
                    id,
                    client_id,
                    address,
                    city, 
                    streetNumber,
                    country,
                    chimneys (
                      id,
                      chimney_type_id,
                      placement,
                      appliance,
                      note,
                      chimney_type:chimney_types (
                        id,
                        type, 
                        labelling
                      )
                    )
                  )
                )
              `)
            .eq("id", pdf.project_id)
            .single();

        if (projectError || !data) throw projectError;
        const project: ProjectWithRelations = transformProjects(data);
        const object = project.objects?.find(obj => obj.object.id === pdf.object_id);
        const chimney = object?.chimneys.find(ch => ch.id === pdf.chimney_id);

        if(!object || !chimney){
            throw new Error("Object or chimney not found!");
        }

        // check for sums 
        let newType = pdf.report_type;
        let sums: string[] | null = null;

        console.log(pdf);

        if (pdf.report_type === "cleaningWithPaymentReceipt" && pdf.amount && pdf.amountByWords){
            sums = await new Promise<string[] | null>((resolve) => {
                Alert.alert(
                    "Regenerovať PDF s PPD dokladom",
                    "Chcete zachovať existujúcu sumu na PDF správe?",
                    [
                        {
                            text: "Zachovať sumu", 
                            onPress: () => resolve([String(pdf.amount), String(pdf.amountByWords)])
                        },
                        {
                            text: "Zmeniť sumu", 
                            onPress: () => resolve(["", ""]) // TODO: Show input modal
                        },
                        {
                            text: "Vymazať sumu", 
                            onPress: () => resolve(null)
                        }
                    ],
                    { cancelable: false } // Optional: prevent dismissing by tapping outside
                );
            });
            if (sums === null) newType = "cleaning";
        }

        console.log("new sums: ",sums);
        // Delete old PDF   
        const parts = pdf.storage_path.split("pdf-reports/");
        const filename = parts[1];
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

        // Generate new version of PDF
        const watermarkBase64 = await getWatermarkBase64();
        const footerBase64 = await getFooterImageBase64();

        const uri = await generateRecord(
            project.project,
            project.users[0],
            project.client,
            object,
            chimney,
            watermarkBase64,
            footerBase64,
            newType as any,
            sums
        );

        if (!uri) throw new Error("Failed to generate new PDF");

        // upload new PDF - include timestamp and random component to make filename unique
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9); // 7 random characters
        const docFilename = pdf.report_type === "cleaning" ||  pdf.report_type === "cleaningWithPaymentReceipt"
            ? `cleaning_${chimney.id}_${pdf.project_id}_${timestamp}_${random}.pdf`
            : `inspection_${chimney.id}_${pdf.project_id}_${timestamp}_${random}.pdf`;
        
        const response = await fetch(uri);
        const blob = await response.blob();
        const arrayBuffer = await new Response(blob).arrayBuffer();
    
        const { error: uploadError } = await supabase
            .storage
            .from("pdf-reports")
            .upload(docFilename, arrayBuffer, {
                contentType: 'application/pdf',
                upsert: false,
            });

        if (uploadError) throw uploadError;
    
        const { data: urlData } = supabase.storage
            .from("pdf-reports")
            .getPublicUrl(docFilename);
    
        const insertData = { 
            project_id: pdf.project_id,
            object_id: pdf.object_id,
            chimney_id: pdf.chimney_id,
            report_type: newType,
            file_name: docFilename,
            file_size: blob.size,
            file_type: blob.type.toString(),
            storage_path: urlData.publicUrl,
            ...(sums ? { amount: Number(sums[0]), amountByWords: sums[1] } : {})
        };  
        
        const { data: newPDF, error: insertError } = await supabase
            .from("pdfs")
            .insert(insertData)
            .select()
            .single();
        
        if (insertError) throw insertError;
        
        return newPDF;    
    }
    catch (error: any){
        console.error("Error regenerating PDF:", error);
        throw error;
    }
}

function transformProjects(projectItem: any): ProjectWithRelations{
    const users: User[] = projectItem.project_assignments
      ?.map((pa: any) => pa.user_profiles)
      .filter(Boolean) || [];
  
    const objects: ObjectWithRelations[] = projectItem.project_objects
      ?.map((po: any) => {
        if (!po.objects) return null;
  
        const chimneys: Chimney[] = po.objects.chimneys
          ?.map((c: any) => {
  
            const chimneyType: ChimneyType | undefined = c.chimney_type 
              ? {
                  id: c.chimney_type.id,
                  type: c.chimney_type.type,
                  labelling: c.chimney_type.labelling
              } 
              : undefined;
                  
            return {
              id: c.id,
              chimney_type_id: c.chimney_type_id,
              chimney_type: chimneyType,
              appliance: c.appliance,
              placement: c.placement,
              note: c.note
            }
  
        })
        .filter(Boolean) || [];
            
            
        return {
          object: po.objects,
          chimneys: chimneys
        };
    })
    .filter(Boolean) || [];
        
    return {
      project: projectItem,
      client: projectItem.clients,
      users: users,
      objects: objects,
    };
}