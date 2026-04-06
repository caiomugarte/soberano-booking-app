import { Link } from 'react-router-dom';

interface FooterProps {
  shopName?: string;
}

export function Footer({ shopName = 'Soberano Barbearia' }: FooterProps) {
  return (
    <footer className="text-center py-6 text-[11px] text-muted/50 space-x-3">
      <span>© {new Date().getFullYear()} {shopName}</span>
      <span>·</span>
      <Link to="/privacidade" className="hover:text-gold transition-colors underline underline-offset-2">
        Política de Privacidade
      </Link>
      <span>·</span>
      <a href="https://altion.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
        Desenvolvido por Altion
      </a>
    </footer>
  );
}
