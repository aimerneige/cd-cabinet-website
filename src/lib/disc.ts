// CD 物理尺寸（ECMA-130 §8）与压盘厂盘面印刷范围。
// 中心孔 15 mm；15–44 mm 为透明塑料（夹持区 26–33 mm）；
// 反射层/信息区到 118 mm，外缘 120 mm。
// 盘面印刷：压盘厂通常 23–116 mm（新进商会 23/116，Duplication 22/116），
// 内外两圈保持透明不印刷。
export const DISC_DIAMETER_MM = 120
export const DISC_HOLE_MM = 15
export const LABEL_INNER_MM = 23
export const LABEL_OUTER_MM = 116

/** 相对整张光盘直径的比例，便于在任意尺寸下绘制。 */
export const LABEL_INNER_RATIO = LABEL_INNER_MM / DISC_DIAMETER_MM
export const LABEL_OUTER_RATIO = LABEL_OUTER_MM / DISC_DIAMETER_MM
