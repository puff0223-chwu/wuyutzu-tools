# 化學尋寶：從原作 APK 抽出題庫與照片（2026-11-03 一次性紀錄）

> 這些腳本是第一次改製時用的，留著備查。題庫已經產生在 `chemistry/treasure/data.js`，平常**不用再跑**。
> 腳本裡的路徑是當時雲端工作區的路徑，要重跑時請改成自己的資料夾。

## 原作是什麼
- 師大附中「化學尋寶」Android App v1.7.0（套件 `air.UnknowChemistry2014`），是 **Adobe AIR（Flash）** 做的
- APK 是 zip：解開後真正的內容在 `assets/UnknowChemistry2014.swf`

## 步驟
1. **反編譯工具 JPEXS（FFDec）**：沒有現成執行檔可下載時，從原始碼編：
   - `git clone --depth 1 https://github.com/jindrapetrik/jpexs-decompiler`
   - `libsrc/ffdec_lib/lexers/*.flex` 先用 `libsrc/ffdec_lib/antlib/jflex-1.6.0.jar` 產生詞法分析器（`*_hilight` 不用），放回 `src/` 對應的 package
   - `javac -d build -cp "lib/*" @所有java檔`，再把 `src/` 裡的非 .java 資源檔複製到 `build/`
2. `Frames.java`：逐格列出每個元件放了什麼（文字、圖形、照片編號）→ `frames.tsv`
   - 題目藥品：`medicine<N>Q<題號>` 第 1～N 格＝中文名，第 11～10+N 格＝化學式（文字用 `|` 分段，奇數段是下標）
   - 照片：`ansJpg<N>Q<題號>` 第 `a×10+b` 格＝第 a 杯混第 b 杯（a ≤ b；`aa`＝單獨觀察）
   - 有一瓶「酚酞」是畫成圖形（shape 223）的字，不是文字 → 用 `Shape.java` 匯出圖片才認出來
3. `Imgs.java`：匯出 14 張照片（`DefineBitsJPEG2`／`DefineBits`＋`JPEGTables`）
4. `build_data.py`：整理成 `questions.json`，並檢查每題 N(N+1)/2 個組合都有照片
5. `build_assets.py`：照片轉 WebP（`img/pNN.webp`）、產生 `data.js`

## 臨時版（給學生先練習用，不在 repo 裡）
- 用 **Ruffle**（開源 Flash 模擬器，npm `@ruffle-rs/ruffle`）直接在瀏覽器播放原作 SWF
- Ruffle 不支援 AIR 的 `flash.filesystem`（原作用它存成績）→ `Patch.java` 用 JPEXS 內建 AS3 編譯器把 `FileProcess` 改成 `SharedObject`、拿掉 `Main` 的 `NativeApplication.exit()`（編譯時要指定 `resources/flashlib/airglobal.swc`）
- Ruffle 的小坑：第一下點在遊戲上的點擊會被拿去「啟動播放器」→ 開始畫面要讓點擊穿過去（`pointer-events: none`）
