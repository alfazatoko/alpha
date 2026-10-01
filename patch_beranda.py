import re

with open("src/views/BerandaView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update interface BerandaViewProps
old_interface = """  kasModal: number
  kasirName: string"""
new_interface = """  kasModal: number
  penjualanVoucherTunai?: number
  kasirName: string"""
content = content.replace(old_interface, new_interface)

# 2. Update KasSummary usage 1 (line ~3242)
old_kas1 = """              <KasSummary 
                kasModal={kasModal}
                penjualanDigital={penjualanDigital}
                penjualanAksesoris={props.totalAksesoris}
                totalAdminFee={props.totalAdmin}
                tarikTunaiNasabah={props.totalTarik}
                transaksiKhusus={props.totalKhusus || 0}
                transaksiNonTunai={props.totalNonTunai || 0}
              />"""
new_kas1 = """              <KasSummary 
                kasModal={kasModal}
                penjualanDigital={penjualanDigital}
                penjualanAksesoris={props.totalAksesoris}
                totalAdminFee={props.totalAdmin}
                penjualanVoucherTunai={props.penjualanVoucherTunai}
                tarikTunaiNasabah={props.totalTarik}
                transaksiKhusus={props.totalKhusus || 0}
                transaksiNonTunai={props.totalNonTunai || 0}
              />"""
content = content.replace(old_kas1, new_kas1)

# 3. Update KasSummary usage 2 (owner monitor) (line ~3762)
old_kas2 = """                  <KasSummary 
                    kasModal={ownerKasModal}
                    penjualanDigital={ownerPenjualanDigital}
                    penjualanAksesoris={ownerTotalAksesoris}
                    totalAdminFee={ownerTotalAdmin}
                    tarikTunaiNasabah={ownerTotalTarik}
                    adminDalamNonTunai={ownerAdminDalam}
                    transaksiKhusus={ownerKhusus}
                    transaksiNonTunai={ownerNonTunai}
                  />"""
new_kas2 = """                  <KasSummary 
                    kasModal={ownerKasModal}
                    penjualanDigital={ownerPenjualanDigital}
                    penjualanAksesoris={ownerTotalAksesoris}
                    totalAdminFee={ownerTotalAdmin}
                    penjualanVoucherTunai={props.penjualanVoucherTunai}
                    tarikTunaiNasabah={ownerTotalTarik}
                    adminDalamNonTunai={ownerAdminDalam}
                    transaksiKhusus={ownerKhusus}
                    transaksiNonTunai={ownerNonTunai}
                  />"""
content = content.replace(old_kas2, new_kas2)

with open("src/views/BerandaView.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched BerandaView!")
