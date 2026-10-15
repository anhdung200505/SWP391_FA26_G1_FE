import React from 'react';

export default function MapSection() {
  // Link Embed chứa ghim đỏ và bảng địa điểm Nhà Văn Hóa Sinh Viên TP.HCM
  const mapEmbedUrl =
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.0833215903064!2d106.8007233!3d10.8751312!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3174d8a6b19d6763%3A0x143c54525028b2e!2zTmjDoCB2xINuIGjDs2EgU2luaCB2acOqbiBUUC5IQ00!5e0!3m2!1svi!2s!4v1710000000000!5m2!1svi!2s';

  return (
    <section className="relative w-full bg-[#12141d] font-sans select-none overflow-hidden">
      {/* Dải viền đỏ trang trí bên trên bản đồ */}
      <div className="w-full h-1.5 bg-[#e31b23] shadow-md"></div>

      {/* Container bản đồ tràn viền 100% */}
      <div className="relative w-full h-[400px] sm:h-[480px] md:h-[520px]">
        <iframe
          title="Vị trí AnhDuy Sport - Nhà Văn Hóa Sinh Viên TP.HCM"
          src={mapEmbedUrl}
          className="w-full h-full border-0 filter contrast-[1.02]"
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>

        {/* Lớp Overlay vát chéo đỏ trang trí góc dưới sát Footer */}
        <div
          className="absolute bottom-0 right-0 w-48 sm:w-64 h-10 bg-[#e31b23] pointer-events-none hidden sm:block"
          style={{
            clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0% 100%)',
          }}
        ></div>
      </div>

      {/* Dải viền đỏ trang trí bên dưới sát Footer */}
      <div className="w-full h-1.5 bg-[#e31b23] shadow-md"></div>
    </section>
  );
}