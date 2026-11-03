import com.jpexs.decompiler.flash.*;
import com.jpexs.decompiler.flash.tags.*;
import com.jpexs.decompiler.flash.tags.base.*;
import java.io.*; import java.util.*;
public class Imgs {
  public static void main(String[] a) throws Exception {
    SWF swf = new SWF(new FileInputStream(a[0]), false);
    new File(a[1]).mkdirs();
    for (Tag t: swf.getTags()) if (t instanceof ImageTag){
      ImageTag it=(ImageTag)t; int id=it.getCharacterId();
      String ext=it.getImageFormat().toString().toLowerCase();
      try (InputStream is=it.getConvertedImageData(); FileOutputStream os=new FileOutputStream(a[1]+"/"+id+"."+ext)){ is.transferTo(os); }
      catch(Exception e){ javax.imageio.ImageIO.write(it.getImageCached().getBufferedImage(),"png",new File(a[1]+"/"+id+".png")); }
      System.out.println(id+" "+ext);
    }
    System.exit(0);
  }
}
