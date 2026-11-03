import com.jpexs.decompiler.flash.*;
import com.jpexs.decompiler.flash.tags.*;
import com.jpexs.decompiler.flash.tags.base.*;
import com.jpexs.decompiler.flash.exporters.*;
import com.jpexs.decompiler.flash.exporters.settings.*;
import com.jpexs.decompiler.flash.exporters.modes.*;
import java.io.*; import java.util.*;
public class Shape {
  public static void main(String[] a) throws Exception {
    SWF swf = new SWF(new FileInputStream(a[0]), false);
    ReadOnlyTagList list = new ReadOnlyTagList(new ArrayList<Tag>(List.of((Tag)swf.getCharacter(Integer.parseInt(a[2])))));
    new ShapeExporter().exportShapes(new AbortRetryIgnoreHandler(){public int handle(Throwable t){t.printStackTrace();return IGNORE;}public AbortRetryIgnoreHandler getNewInstance(){return this;}},
      a[1], swf, list, new ShapeExportSettings(ShapeExportMode.PNG, 3), null, 1, 1);
    System.exit(0);
  }
}
