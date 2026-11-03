import com.jpexs.decompiler.flash.*;
import com.jpexs.decompiler.flash.tags.*;
import com.jpexs.decompiler.flash.tags.base.*;
import com.jpexs.decompiler.flash.timeline.*;
import java.io.*; import java.util.*;
public class Frames {
  static SWF swf;
  static String desc(int cid, int depthLvl){
    CharacterTag c = swf.getCharacter(cid);
    if (c==null) return "?"+cid;
    if (c instanceof TextTag) return "T\""+String.join("|",((TextTag)c).getTexts()).replace("\n"," ").replace("\r"," ")+"\"";
    if (c instanceof ShapeTag){ Set<Integer> s=new TreeSet<>(); ((ShapeTag)c).getNeededCharactersDeep(s, new HashSet<String>()); return s.isEmpty()? "S"+cid : "S"+cid+"img"+s; }
    if (c instanceof DefineSpriteTag){
      if (depthLvl>4) return "SP"+cid;
      DefineSpriteTag sp=(DefineSpriteTag)c; Timeline tl=sp.getTimeline();
      if (tl.getFrameCount()==0) return "SP"+cid+"[]";
      List<String> parts=new ArrayList<>();
      for (DepthState d: tl.getFrame(0).layers.values()) if(d.characterId>=0) parts.add(desc(d.characterId,depthLvl+1));
      return "SP"+cid+"{"+String.join(",",parts)+"}";
    }
    return c.getClass().getSimpleName()+cid;
  }
  public static void main(String[] a) throws Exception {
    swf = new SWF(new FileInputStream(a[0]), false);
    for (Tag t: swf.getTags()){
      if (!(t instanceof DefineSpriteTag)) continue;
      DefineSpriteTag sp=(DefineSpriteTag)t;
      String cls=String.join(",",sp.getClassNames());
      if (!cls.matches(a[1])) continue;
      Timeline tl=sp.getTimeline();
      for (int f=0; f<tl.getFrameCount(); f++){
        List<String> parts=new ArrayList<>();
        for (DepthState d: tl.getFrame(f).layers.values()) if(d.characterId>=0) parts.add(desc(d.characterId,0));
        System.out.println(cls+"\t"+(f+1)+"\t"+String.join(" ; ",parts));
      }
    }
    System.exit(0);
  }
}
