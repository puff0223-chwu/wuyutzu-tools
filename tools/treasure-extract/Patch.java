import com.jpexs.decompiler.flash.*;
import com.jpexs.decompiler.flash.abc.ScriptPack;
import com.jpexs.decompiler.flash.importers.*;
import java.io.*; import java.nio.file.*; import java.util.*;
public class Patch {
  public static void main(String[] a) throws Exception {
    String fl="/home/claude/jindrapetrik/jpexs-decompiler/resources/flashlib/";
    com.jpexs.decompiler.flash.configuration.Configuration.airLibLocation.set(fl+"airglobal.swc");
    com.jpexs.decompiler.flash.configuration.Configuration.playerLibLocation.set(fl+"playerglobal32_0.swc");
    SWF swf = new SWF(new FileInputStream(a[0]), false);
    As3ScriptReplacerInterface rep = As3ScriptReplacerFactory.createFFDecAir();
    for (int i=2;i<a.length;i+=2){
      String cls=a[i]; String code=new String(Files.readAllBytes(Paths.get(a[i+1])),"UTF-8");
      boolean done=false;
      for (ScriptPack p: swf.getAS3Packs()){
        if (p.getClassPath().toString().equals(cls)){
          try { p.abc.replaceScriptPack(rep,p,code,new ArrayList<>()); } catch(As3ScriptReplaceException ex){ for(As3ScriptReplaceExceptionItem it: ex.getExceptionItems()) System.out.println("ERR "+it.getFile()+":"+it.getLine()+" "+it.getMessage()); throw ex; } done=true; System.out.println("replaced "+cls); break;
        }
      }
      if(!done) throw new RuntimeException("not found "+cls);
    }
    try(OutputStream os=new FileOutputStream(a[1])){ swf.saveTo(os); }
    System.out.println("saved"); System.exit(0);
  }
}
