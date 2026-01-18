import { User } from "@/types/generics";
import { Chimney, ChimneyType, ObjectWithRelations } from "@/types/objectSpecific";
import { ProjectWithRelations } from "@/types/projectSpecific";

export function transformProjects(data: any): ProjectWithRelations[] {
  return data
    .filter((projectItem: any) => projectItem?.id && projectItem?.clients)
    .map((projectItem: any) => {
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
    });
}