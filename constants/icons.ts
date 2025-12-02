import { Asset } from 'expo-asset';
import projectsIcon from "../assets/icons/checklist_6019826.png";
import chimneyIcon from "../assets/icons/chimney_5628507.png";
import chimney2Icon from "../assets/icons/chimney_5699745.png";
import clientsIcon from "../assets/icons/customer_3126649.png";
import homeIcon from "../assets/icons/home_10102571.png";
import personIcon from "../assets/icons/person.png";
import planningIcon from "../assets/icons/strategy_9373111.png";
import footerImage from "../assets/images/image1.png";
import watermark1 from "../assets/images/image2.png";

export const icons = {
    chimneyIcon,
    chimney2Icon,
    projectsIcon,
    personIcon,
    clientsIcon,
    planningIcon,
    homeIcon
}

// Helper function to convert asset to base64
const assetToBase64 = async (assetPath: any): Promise<string> => {
    try {
      const asset = Asset.fromModule(assetPath);
      await asset.downloadAsync();
    
      if (!asset.localUri) {
        throw new Error('Asset not loaded');
      }
    const response = await fetch(asset.localUri);
    const blob = await response.blob();
  
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting asset to base64:', error);
    throw error;
  }
};

  
  // Export async functions to get base64 images
  export const getWatermarkBase64 = () => assetToBase64(watermark1);
  export const getFooterImageBase64 = () => assetToBase64(footerImage);