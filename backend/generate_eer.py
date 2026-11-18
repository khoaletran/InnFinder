import os
import math
import xml.etree.ElementTree as ET
from xml.dom import minidom

def generate_eer_v2():
    root = ET.Element("mxfile", {
        "host": "Electron",
        "agent": "Antigravity InnFinder",
        "version": "21.6.8",
        "type": "device"
    })
    diagram = ET.SubElement(root, "diagram", {
        "id": "innfinder-eer-diagram-v2",
        "name": "EER Hệ Thống Quản Lý Phòng Trọ"
    })
    model = ET.SubElement(diagram, "mxGraphModel", {
        "dx": "2500",
        "dy": "1500",
        "grid": "1",
        "gridSize": "10",
        "guides": "1",
        "tooltips": "1",
        "connect": "1",
        "arrows": "1",
        "fold": "1",
        "page": "1",
        "pageScale": "1",
        "pageWidth": "4200",
        "pageHeight": "2600",
        "math": "0",
        "shadow": "0"
    })
    cells_root = ET.SubElement(model, "root")
    
    ET.SubElement(cells_root, "mxCell", {"id": "0"})
    ET.SubElement(cells_root, "mxCell", {"id": "1", "parent": "0"})
    
    counter = 2
    def next_id():
        nonlocal counter
        cid = str(counter)
        counter += 1
        return cid

    entities = {}
    relationships = {}

    # Title
    t_id = next_id()
    t_cell = ET.SubElement(cells_root, "mxCell", {
        "id": t_id,
        "value": "<font style='font-size: 22px; font-weight: bold;'>EER Hệ Thống Quản Lý Phòng Trọ - InnFinder</font>",
        "style": "text;html=1;align=center;verticalAlign=middle;resizable=0;points=[];autosize=1;strokeColor=none;fillColor=none;fontFamily=Helvetica;",
        "vertex": "1",
        "parent": "1"
    })
    ET.SubElement(t_cell, "mxGeometry", {
        "x": "1650",
        "y": "80",
        "width": "500",
        "height": "40",
        "as": "geometry"
    })

    def add_entity(name, x, y, width=150, height=46, is_weak=False):
        cid = next_id()
        if is_weak:
            # Double rectangle for weak / associative entity
            style = "shape=ext;double=1;rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontFamily=Helvetica;fontSize=12;fontStyle=1;strokeWidth=1.5;"
        else:
            style = "rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontFamily=Helvetica;fontSize=12;fontStyle=1;strokeWidth=1.5;"
        cell = ET.SubElement(cells_root, "mxCell", {
            "id": cid,
            "value": f"<b>{name.upper()}</b>",
            "style": style,
            "vertex": "1",
            "parent": "1"
        })
        ET.SubElement(cell, "mxGeometry", {
            "x": str(x),
            "y": str(y),
            "width": str(width),
            "height": str(height),
            "as": "geometry"
        })
        entities[name] = {"id": cid, "x": x, "y": y, "w": width, "h": height}
        return cid

    def add_attribute(ent_name, attr_name, x, y, is_pk=False, is_derived=False, is_multivalued=False, width=115, height=36):
        cid = next_id()
        ent = entities[ent_name]
        val = attr_name.upper()
        if is_pk:
            val = f"<u><b>{val}</b></u>"
            style = "ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontFamily=Helvetica;fontSize=10;fontStyle=1;strokeWidth=1.5;"
        elif is_derived:
            style = "ellipse;whiteSpace=wrap;html=1;dashed=1;fillColor=#ffffff;strokeColor=#333333;fontFamily=Helvetica;fontSize=10;strokeWidth=1.2;"
        elif is_multivalued:
            style = "ellipse;shape=doubleEllipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontFamily=Helvetica;fontSize=10;strokeWidth=1.2;"
        else:
            style = "ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#333333;fontFamily=Helvetica;fontSize=10;"
            
        cell = ET.SubElement(cells_root, "mxCell", {
            "id": cid,
            "value": val,
            "style": style,
            "vertex": "1",
            "parent": "1"
        })
        ET.SubElement(cell, "mxGeometry", {
            "x": str(x),
            "y": str(y),
            "width": str(width),
            "height": str(height),
            "as": "geometry"
        })
        
        # Link attribute to entity
        edge_id = next_id()
        edge = ET.SubElement(cells_root, "mxCell", {
            "id": edge_id,
            "style": "endArrow=none;html=1;rounded=0;strokeColor=#666666;strokeWidth=1;",
            "edge": "1",
            "parent": "1",
            "source": cid,
            "target": ent["id"]
        })
        ET.SubElement(edge, "mxGeometry", {"relative": "1", "as": "geometry"})
        return cid

    def add_relationship(rel_name, x, y, width=75, height=45):
        cid = next_id()
        style = "rhombus;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontFamily=Helvetica;fontSize=11;fontStyle=0;fontColor=#b85450;strokeWidth=1.5;"
        cell = ET.SubElement(cells_root, "mxCell", {
            "id": cid,
            "value": f"<b>{rel_name}</b>",
            "style": style,
            "vertex": "1",
            "parent": "1"
        })
        ET.SubElement(cell, "mxGeometry", {
            "x": str(x),
            "y": str(y),
            "width": str(width),
            "height": str(height),
            "as": "geometry"
        })
        relationships[rel_name] = {"id": cid, "x": x, "y": y, "w": width, "h": height}
        return cid

    def connect_rel(ent_name, rel_name, card):
        ent_id = entities[ent_name]["id"]
        rel_id = relationships[rel_name]["id"]
        edge_id = next_id()
        
        style = "endArrow=none;html=1;rounded=0;strokeColor=#333333;strokeWidth=1.2;fontFamily=Helvetica;fontSize=11;fontStyle=1;labelBackgroundColor=#ffffff;"
        edge = ET.SubElement(cells_root, "mxCell", {
            "id": edge_id,
            "value": card,
            "style": style,
            "edge": "1",
            "parent": "1",
            "source": ent_id,
            "target": rel_id
        })
        ET.SubElement(edge, "mxGeometry", {"relative": "1", "as": "geometry"})

    # ==========================
    # 1. ENTITY: NGUOI_DUNG (Center-Left)
    # ==========================
    add_entity("NGUOI_DUNG", 1300, 1050, 155, 48)
    nd_attrs = [
        ("MAND", 1110, 890, True, False),
        ("TENDANGNHAP", 1070, 940, False, False),
        ("MATKHAU", 1060, 990, False, False),
        ("HOVATEN", 1060, 1040, False, False),
        ("EMAIL", 1060, 1090, False, False),
        ("SDT", 1070, 1140, False, False),
        ("CCCD", 1100, 1190, False, False),
        ("VAITRO", 1140, 1235, False, False),
        ("CHUTRO", 1210, 1270, False, False),
        ("THOIGIANMO", 1300, 1290, False, False),
        ("KICHHOAT", 1400, 1285, False, False),
    ]
    for name, x, y, pk, der in nd_attrs:
        add_attribute("NGUOI_DUNG", name, x, y, is_pk=pk, is_derived=der)

    # ==========================
    # 2. SPECIALIZATION: ISA CHU_TRO (Yellow Circle)
    # ==========================
    # Add ISA Circle
    isa_id = next_id()
    isa_cell = ET.SubElement(cells_root, "mxCell", {
        "id": isa_id,
        "value": "<b>ISA</b>",
        "style": "ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontFamily=Helvetica;fontSize=11;fontStyle=1;strokeWidth=1.5;",
        "vertex": "1",
        "parent": "1"
    })
    ET.SubElement(isa_cell, "mxGeometry", {
        "x": "1630",
        "y": "1054",
        "width": "40",
        "height": "40",
        "as": "geometry"
    })
    
    # Connect NGUOI_DUNG -> ISA circle
    e_isa1 = ET.SubElement(cells_root, "mxCell", {
        "id": next_id(),
        "style": "endArrow=none;html=1;rounded=0;strokeColor=#333333;strokeWidth=1.5;",
        "edge": "1",
        "parent": "1",
        "source": entities["NGUOI_DUNG"]["id"],
        "target": isa_id
    })
    ET.SubElement(e_isa1, "mxGeometry", {"relative": "1", "as": "geometry"})

    # Entity CHU_TRO
    add_entity("CHU_TRO", 1820, 1050, 140, 48)
    
    # Connect ISA circle -> CHU_TRO (Subset symbol or clean link)
    e_isa2 = ET.SubElement(cells_root, "mxCell", {
        "id": next_id(),
        "value": "⊂",
        "style": "endArrow=none;html=1;rounded=0;strokeColor=#333333;strokeWidth=1.5;fontFamily=Helvetica;fontSize=14;fontStyle=1;labelBackgroundColor=#ffffff;",
        "edge": "1",
        "parent": "1",
        "source": isa_id,
        "target": entities["CHU_TRO"]["id"]
    })
    ET.SubElement(e_isa2, "mxGeometry", {"relative": "1", "as": "geometry"})

    ct_attrs = [
        ("DIEMUY_TIN", 1980, 1020, False, False),
        ("SODU", 1980, 1080, False, False),
    ]
    for name, x, y, pk, der in ct_attrs:
        add_attribute("CHU_TRO", name, x, y, is_pk=pk, is_derived=der)

    # ==========================
    # 3. ENTITY: TAI_KHOAN_NGAN_HANG (Mid-Left)
    # ==========================
    add_entity("TAI_KHOAN_NGAN_HANG", 550, 1050, 175, 48)
    add_relationship("liên kết", 950, 1052, 75, 44)
    connect_rel("NGUOI_DUNG", "liên kết", "(1,1)")
    connect_rel("TAI_KHOAN_NGAN_HANG", "liên kết", "(0,n)")
    
    tknh_attrs = [
        ("ID_TKNH", 370, 1010, True, False),
        ("SOTAIKHOAN", 350, 1060, False, False),
        ("TENNGANHANG", 370, 1110, False, False),
    ]
    for name, x, y, pk, der in tknh_attrs:
        add_attribute("TAI_KHOAN_NGAN_HANG", name, x, y, is_pk=pk, is_derived=der)

    # ==========================
    # 4. ENTITY: YEU_CAU_CHU_TRO (Top-Left)
    # Multi-role: Gửi yêu cầu + Duyệt yêu cầu
    # ==========================
    add_entity("YEU_CAU_CHU_TRO", 600, 520, 160, 48)
    
    # Relationship: gửi
    add_relationship("gửi yc", 930, 680, 75, 44)
    connect_rel("NGUOI_DUNG", "gửi yc", "(0,n)")
    connect_rel("YEU_CAU_CHU_TRO", "gửi yc", "(1,1)")
    
    # Relationship: duyệt
    add_relationship("duyệt yc", 1010, 760, 75, 44)
    connect_rel("NGUOI_DUNG", "duyệt yc", "(0,n)")
    connect_rel("YEU_CAU_CHU_TRO", "duyệt yc", "(0,1)")
    
    yc_attrs = [
        ("MAYEUCAU", 440, 420, True, False),
        ("SO_CCCD", 550, 390, False, False),
        ("NGAY_YEUCAU", 660, 390, False, False),
        ("TRANGTHAI", 770, 420, False, False),
        ("LYDO_TUCHOI", 420, 480, False, False),
        ("NGAY_DUYET", 420, 540, False, False),
    ]
    for name, x, y, pk, der in yc_attrs:
        add_attribute("YEU_CAU_CHU_TRO", name, x, y, is_pk=pk, is_derived=der)

    # ==========================
    # 5. ENTITY: GIAO_DICH (Top Center-Left)
    # ==========================
    add_entity("GIAO_DICH", 1300, 450, 140, 48)
    add_relationship("thực hiện", 1335, 750, 80, 44)
    connect_rel("NGUOI_DUNG", "thực hiện", "(0,n)")
    connect_rel("GIAO_DICH", "thực hiện", "(1,1)")
    
    gd_attrs = [
        ("MAGIAODICH", 1120, 360, True, False),
        ("SOTIEN", 1210, 330, False, False),
        ("LOAIGD", 1310, 320, False, False),
        ("PHUONGTHUC", 1420, 330, False, False),
        ("THOIGIANGD", 1510, 360, False, False),
        ("TRANGTHAI", 1530, 420, False, False),
        ("MATHAMCHIEU", 1520, 480, False, False),
    ]
    for name, x, y, pk, der in gd_attrs:
        add_attribute("GIAO_DICH", name, x, y, is_pk=pk, is_derived=der)

    # ==========================
    # 6. ENTITY: PHIEU_KHIEU_NAI (Bottom-Left)
    # Multi-role: gửi khiếu nại, bị khiếu nại, duyệt khiếu nại
    # ==========================
    add_entity("PHIEU_KHIEU_NAI", 550, 1650, 160, 48)
    
    # 1. gửi
    add_relationship("gửi kn", 850, 1450, 75, 44)
    connect_rel("NGUOI_DUNG", "gửi kn", "(0,n)")
    connect_rel("PHIEU_KHIEU_NAI", "gửi kn", "(1,1)")
    
    # 2. bị khiếu nại
    add_relationship("bị khiếu nại", 940, 1530, 85, 44)
    connect_rel("NGUOI_DUNG", "bị khiếu nại", "(0,n)")
    connect_rel("PHIEU_KHIEU_NAI", "bị khiếu nại", "(0,n)")
    
    # 3. duyệt khiếu nại
    add_relationship("duyệt kn", 1040, 1610, 75, 44)
    connect_rel("NGUOI_DUNG", "duyệt kn", "(0,n)")
    connect_rel("PHIEU_KHIEU_NAI", "duyệt kn", "(0,1)")
    
    kn_attrs = [
        ("MAKHIEUNAI", 370, 1560, True, False),
        ("VANDE", 360, 1610, False, False),
        ("HINHANH", 360, 1660, False, False),
        ("TRANGTHAI", 370, 1710, False, False),
        ("THOIGIANTAO", 410, 1760, False, False),
        ("MUCDOVIPHAM", 510, 1790, False, False),
        ("KETQUAXULY", 620, 1790, False, False),
    ]
    for name, x, y, pk, der in kn_attrs:
        add_attribute("PHIEU_KHIEU_NAI", name, x, y, is_pk=pk, is_derived=der)

    # ==========================
    # 7. ENTITY: PHONG_TRO (Center-Right)
    # ==========================
    add_entity("PHONG_TRO", 2550, 1050, 150, 48)
    
    # CHU_TRO sở hữu PHONG_TRO
    add_relationship("sở hữu", 2200, 1052, 75, 44)
    connect_rel("CHU_TRO", "sở hữu", "(1,1)")
    connect_rel("PHONG_TRO", "sở hữu", "(0,n)")
    
    pt_attrs = [
        ("MAPHONG", 2420, 920, True, False),
        ("TIEUDE", 2510, 890, False, False),
        ("GIATHUE", 2620, 890, False, False),
        ("DIENTICH", 2720, 910, False, False),
        ("SONGUOI", 2780, 960, False, False),
        ("MOTA", 2790, 1020, False, False),
        ("DIACHI", 2790, 1080, False, False),
        ("KINHDO", 2780, 1140, False, False),
        ("VIDO", 2730, 1190, False, False),
        ("COCPHONG", 2650, 1220, False, False),
        ("THOIGIANDANG", 2540, 1230, False, False),
        ("TRANGTHAI", 2430, 1210, False, False),
    ]
    for name, x, y, pk, der in pt_attrs:
        add_attribute("PHONG_TRO", name, x, y, is_pk=pk, is_derived=der)

    # ==========================
    # 8. ENTITY: LOAI_PHONG_TRO, COC, PHI_THU (Top-Right Chain)
    # ==========================
    add_entity("LOAI_PHONG_TRO", 3100, 520, 155, 48)
    
    # PHONG_TRO thuộc loại LOAI_PHONG_TRO
    add_relationship("thuộc loại", 2800, 750, 80, 44)
    connect_rel("PHONG_TRO", "thuộc loại", "(1,1)")
    connect_rel("LOAI_PHONG_TRO", "thuộc loại", "(0,n)")
    
    lpt_attrs = [
        ("MALPT", 3010, 430, True, False),
        ("TENLOAIPHONG", 3160, 430, False, False),
    ]
    for name, x, y, pk, der in lpt_attrs:
        add_attribute("LOAI_PHONG_TRO", name, x, y, is_pk=pk, is_derived=der)

    # COC
    add_entity("COC", 3550, 520, 120, 48)
    add_relationship("quy định", 3340, 522, 75, 44)
    connect_rel("LOAI_PHONG_TRO", "quy định", "(1,1)")
    connect_rel("COC", "quy định", "(1,1)")
    
    coc_attrs = [
        ("MACOC", 3490, 430, True, False),
        ("SOTIENCOC", 3620, 430, False, False),
    ]
    for name, x, y, pk, der in coc_attrs:
        add_attribute("COC", name, x, y, is_pk=pk, is_derived=der)

    # PHI_THU
    add_entity("PHI_THU", 3950, 520, 120, 48)
    add_relationship("tính phí", 3750, 522, 75, 44)
    connect_rel("COC", "tính phí", "(1,1)")
    connect_rel("PHI_THU", "tính phí", "(1,1)")
    
    phi_attrs = [
        ("MAPHITHU", 3890, 430, True, False),
        ("PHI", 4010, 430, False, False),
        ("THOIGIAN_APDUNG", 4050, 490, False, False),
    ]
    for name, x, y, pk, der in phi_attrs:
        add_attribute("PHI_THU", name, x, y, is_pk=pk, is_derived=der)

    # ==========================
    # 9. ENTITY: HINH_ANH (Mid Top-Right)
    # ==========================
    add_entity("HINH_ANH", 2150, 750, 130, 48)
    add_relationship("có ảnh", 2380, 880, 75, 44)
    connect_rel("PHONG_TRO", "có ảnh", "(1,1)")
    connect_rel("HINH_ANH", "có ảnh", "(1,n)")
    
    ha_attrs = [
        ("MAHINHANH", 2050, 670, True, False),
        ("DUONGDAN", 2200, 670, False, False),
    ]
    for name, x, y, pk, der in ha_attrs:
        add_attribute("HINH_ANH", name, x, y, is_pk=pk, is_derived=der)

    # ==========================
    # 10. TIEN_ICH & TIEN_ICH_PHONG (Bottom-Right)
    # Associative Entity TIEN_ICH_PHONG (Double Rectangle in Light Blue)
    # ==========================
    add_entity("TIEN_ICH_PHONG", 3100, 1400, 150, 48, is_weak=True)
    
    add_relationship("trang bị", 2800, 1260, 75, 44)
    connect_rel("PHONG_TRO", "trang bị", "(1,n)")
    connect_rel("TIEN_ICH_PHONG", "trang bị", "(1,1)")
    
    add_entity("TIEN_ICH", 3600, 1400, 130, 48)
    add_relationship("gồm có", 3360, 1402, 75, 44)
    connect_rel("TIEN_ICH_PHONG", "gồm có", "(1,1)")
    connect_rel("TIEN_ICH", "gồm có", "(1,n)")
    
    ti_attrs = [
        ("MATIENICH", 3730, 1330, True, False),
        ("TENTIENICH", 3760, 1400, False, False),
        ("BIEUTUONG", 3730, 1470, False, False),
    ]
    for name, x, y, pk, der in ti_attrs:
        add_attribute("TIEN_ICH", name, x, y, is_pk=pk, is_derived=der)

    # ==========================
    # 11. PHIEU_DAT_LICH (Bottom Center)
    # Between NGUOI_DUNG and PHONG_TRO
    # ==========================
    add_entity("PHIEU_DAT_LICH", 2000, 1900, 160, 48)
    
    # Relationship: NGUOI_DUNG đặt lịch xem
    add_relationship("đặt xem", 1550, 1750, 75, 44)
    connect_rel("NGUOI_DUNG", "đặt xem", "(0,n)")
    connect_rel("PHIEU_DAT_LICH", "đặt xem", "(1,1)")
    
    # Relationship: PHIEU_DAT_LICH cho phòng
    add_relationship("cho phòng", 2400, 1750, 80, 44)
    connect_rel("PHIEU_DAT_LICH", "cho phòng", "(1,1)")
    connect_rel("PHONG_TRO", "cho phòng", "(0,n)")
    
    pdl_attrs = [
        ("MADATLICH", 1780, 1970, True, False),
        ("THOIGIANHEN", 1880, 2010, False, False),
        ("THOIGIANTAO", 1990, 2030, False, False),
        ("TIENCOC", 2100, 2020, False, False),
        ("PHIDICHVU", 2200, 1990, False, False),
        ("TRANGTHAI", 2270, 1940, False, False),
        ("KH_DONGY", 2270, 1870, False, False),
        ("CT_DONGY", 2210, 1820, False, False),
        ("KH_DANHANCOC", 1750, 1910, False, False),
        ("GHICHU", 1760, 1850, False, False),
        ("LIDOHUY", 1840, 1810, False, False),
    ]
    for name, x, y, pk, der in pdl_attrs:
        add_attribute("PHIEU_DAT_LICH", name, x, y, is_pk=pk, is_derived=der)

    # ==========================
    # 12. DANH_GIA (Mid-Lower Center)
    # Between NGUOI_DUNG and PHONG_TRO
    # ==========================
    add_entity("DANH_GIA", 1700, 1450, 140, 48)
    
    # NGUOI_DUNG đánh giá
    add_relationship("đánh giá", 1480, 1330, 75, 44)
    connect_rel("NGUOI_DUNG", "đánh giá", "(0,n)")
    connect_rel("DANH_GIA", "đánh giá", "(1,1)")
    
    # PHONG_TRO nhận đánh giá
    add_relationship("nhận xét", 2050, 1330, 75, 44)
    connect_rel("DANH_GIA", "nhận xét", "(1,1)")
    connect_rel("PHONG_TRO", "nhận xét", "(0,n)")
    
    dg_attrs = [
        ("MADANHGIA", 1580, 1530, True, False),
        ("DIEM", 1690, 1550, False, False),
        ("NOIDUNG", 1800, 1540, False, False),
        ("THOIGIANDG", 1870, 1480, False, False),
    ]
    for name, x, y, pk, der in dg_attrs:
        add_attribute("DANH_GIA", name, x, y, is_pk=pk, is_derived=der)

    # ==========================
    # 13. PHONG_YEU_THICH (Mid Center-Right, between NGUOI_DUNG & PHONG_TRO)
    # Associative Entity in Light Blue Double Rectangle
    # ==========================
    add_entity("PHONG_YEU_THICH", 2050, 1600, 160, 48, is_weak=True)
    
    # Relationship: NGUOI_DUNG lưu yêu thích
    add_relationship("lưu thích", 1750, 1602, 75, 44)
    connect_rel("NGUOI_DUNG", "lưu thích", "(0,n)")
    connect_rel("PHONG_YEU_THICH", "lưu thích", "(1,1)")
    
    # Relationship: PHONG_TRO được yêu thích
    add_relationship("được thích", 2330, 1602, 80, 44)
    connect_rel("PHONG_YEU_THICH", "được thích", "(1,1)")
    connect_rel("PHONG_TRO", "được thích", "(0,n)")
    
    pyt_attrs = [
        ("NGAYTHEM", 2080, 1680, False, False),
    ]
    for name, x, y, pk, der in pyt_attrs:
        add_attribute("PHONG_YEU_THICH", name, x, y, is_pk=pk, is_derived=der)

    # Save to file
    out_dir = r"d:\USBDaMat\WWW\InnFinder"
    out_file = os.path.join(out_dir, "innfinder_eer_diagram.drawio")
    
    xml_str = ET.tostring(root, encoding="utf-8")
    parsed = minidom.parseString(xml_str)
    pretty_xml = parsed.toprettyxml(indent="  ")
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(pretty_xml)
    print(f"Successfully generated {out_file} with size {os.path.getsize(out_file)} bytes")

    # Also sync to artifact directory
    artifact_path = r"C:\Users\Administrator\.gemini\antigravity\brain\76161dd1-80b1-4ee1-b968-f69c61c0da19\innfinder_eer_diagram.drawio"
    with open(artifact_path, "w", encoding="utf-8") as f:
        f.write(pretty_xml)
    print(f"Synced to artifact path: {artifact_path}")

if __name__ == "__main__":
    generate_eer_v2()
