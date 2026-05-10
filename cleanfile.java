import java.io.*;
import java.nio.file.*;

public class cleanfile {
    public static void main(String[] args) throws Exception {
        String file = "C:/Users/dieud/Desktop/Inua/hospital-backend/src/main/java/com/hospital/backend/controller/DoctorChatController.java";
        byte[] bytes = Files.readAllBytes(Paths.get(file));
        
        // Remove BOM if present
        int start = 0;
        if (bytes.length >= 3 && bytes[0] == (byte)0xEF && bytes[1] == (byte)0xBB && bytes[2] == (byte)0xBF) {
            start = 3;
            System.out.println("BOM found and removed");
        }
        
        // Write without BOM using UTF-8
        String content = new String(bytes, start, bytes.length - start, "UTF-8");
        Files.write(Paths.get(file), content.getBytes("UTF-8"));
        System.out.println("File cleaned successfully");
    }
}
