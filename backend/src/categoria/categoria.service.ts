import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Categoria, CategoriaDocument } from './categoria.schema';

@Injectable()
export class CategoriaService implements OnModuleInit {
  private readonly logger = new Logger(CategoriaService.name);
  private categoriasCache: Categoria[] = [];

  constructor(
    @InjectModel(Categoria.name)
    private readonly categoriaModel: Model<CategoriaDocument>,
  ) {}

  async onModuleInit() {
    await this.seedDatabase();
    await this.carregarCache();
  }

  async carregarCache() {
    this.categoriasCache = await this.categoriaModel.find().lean();
    this.logger.log(`Carregadas ${this.categoriasCache.length} categorias em memória.`);
  }

  async seedDatabase() {
    const count = await this.categoriaModel.countDocuments();
    if (count > 0) {
      return;
    }

    this.logger.log('Coleção de categorias está vazia. Iniciando seed...');

    const seedData = [
      {
        nome: "Cereais e Grãos",
        subcategorias: [
          { nome: "Arroz", palavrasChave: ["arroz", "agulhinha", "parboilizado", "arbóreo", "arboreo", "negro", "integral"] },
          { nome: "Feijão", palavrasChave: ["feijão", "feijao", "carioca", "preto", "fradinho", "branco", "corda", "verde", "macassar"] },
          { nome: "Trigo e Derivados", palavrasChave: ["trigo", "farinha", "farelo de trigo", "sêmola", "semola"] },
          { nome: "Milho e Derivados", palavrasChave: ["milho", "pipoca", "canjica", "canjiquinha", "fubá", "fuba", "flocos", "flocão", "flocao"] },
          { nome: "Aveia", palavrasChave: ["aveia"] },
          { nome: "Outros Grãos", palavrasChave: ["quinoa", "grão-de-bico", "grao-de-bico", "lentilha", "ervilha seca", "linhaça", "linhaca", "chia", "soja"] },
          { nome: "Cereais Matinais", palavrasChave: ["cereal", "cereais", "corn flakes", "granola"] }
        ]
      },
      {
        nome: "Perfumaria e Cosméticos",
        subcategorias: [
          { nome: "Higiene Capilar", palavrasChave: ["shampoo", "condicionador", "máscara", "mascara", "creme de pentear", "reparador"] },
          { nome: "Higiene Corporal", palavrasChave: ["sabonete", "desodorante", "hidratante corporal", "algodão", "cotonete"] },
          { nome: "Cuidados Faciais", palavrasChave: ["facial", "micelar", "protetor solar", "antirrugas", "tônico", "tonico"] },
          { nome: "Higiene Bucal", palavrasChave: ["creme dental", "escova dental", "escova de dentes", "fio dental", "enxaguante"] },
          { nome: "Perfumaria Fina", palavrasChave: ["perfume", "colônia", "colonia", "body splash", "loção", "locao"] },
          { nome: "Cuidados com Cabelo", palavrasChave: ["tintura", "gel", "géls", "pomada", "spray"] },
          { nome: "Maquiagem", palavrasChave: ["maquiagem", "base", "corretivo", "batom", "rímel", "rimel", "delineador", "pó compacto"] },
          { nome: "Produtos Infantis", palavrasChave: ["infantil", "bebê", "bebe", "talco", "lenço", "lenco", "fralda"] }
        ]
      },
      {
        nome: "Saneantes e Limpeza",
        subcategorias: [
          { nome: "Lavanderia", palavrasChave: ["sabão em pó", "sabao em po", "sabão líquido", "sabao liquido", "amaciante", "alvejante", "tira-manchas", "sabão em barra", "sabao em barra"] },
          { nome: "Limpeza de Superfícies", palavrasChave: ["desinfetante", "multiuso", "álcool", "alcool", "limpa-vidro", "desengordurante"] },
          { nome: "Cozinha e Louças", palavrasChave: ["detergente", "sabão em pasta", "sabao em pasta", "esponja", "pastilha"] },
          { nome: "Banheiro", palavrasChave: ["água sanitária", "agua sanitaria", "sanitário", "sanitario", "papel higiênico", "papel higienico", "pedra sanitária"] },
          { nome: "Pisos e Móveis", palavrasChave: ["cera", "lustra-móveis", "lustra-moveis", "limpa-piso"] },
          { nome: "Acessórios de Limpeza", palavrasChave: ["saco de lixo", "pano", "flanela", "rodo", "vassoura", "luva", "papel toalha"] }
        ]
      },
      {
        nome: "Mercearia Doce",
        subcategorias: [
          { nome: "Açúcar e Adoçantes", palavrasChave: ["açúcar", "acucar", "adoçante", "adocante"] },
          { nome: "Biscoitos e Bolachas", palavrasChave: ["biscoito", "bolacha", "cookie", "wafer", "waffer", "cream cracker", "maisena"] },
          { nome: "Café e Achocolatados", palavrasChave: ["café", "cafe", "achocolatado", "cacau"] },
          { nome: "Matinais e Sobremesas", palavrasChave: ["gelatina", "pudim", "mistura para bolo", "geleia", "mel", "leite em pó", "leite em po", "barra de cereal"] }
        ]
      },
      {
        nome: "Mercearia Salgada",
        subcategorias: [
          { nome: "Massas", palavrasChave: ["macarrão", "macarrao", "massa", "espaguete", "miojo"] },
          { nome: "Óleos e Gorduras", palavrasChave: ["óleo", "oleo", "azeite", "banha", "margarina", "manteiga"] },
          { nome: "Molhos e Condimentos", palavrasChave: ["molho", "extrato", "maionese", "ketchup", "mostarda", "vinagre"] },
          { nome: "Enlatados e Conservas", palavrasChave: ["conserva", "ervilha", "sardinha", "atum", "azeitona", "palmito"] },
          { nome: "Temperos", palavrasChave: ["sal", "caldo", "pimenta", "alho", "orégano", "oregano"] }
        ]
      },
      {
        nome: "Bebidas",
        subcategorias: [
          { nome: "Não Alcoólicas", palavrasChave: ["refrigerante", "suco", "água mineral", "agua mineral", "água tônica", "agua tonica", "energético", "energetico", "polpa"] },
          { nome: "Alcoólicas", palavrasChave: ["cerveja", "vinho", "espumante", "vodca", "uísque", "uisque", "cachaça", "cachaca", "drink"] }
        ]
      },
      {
        nome: "Descartáveis",
        subcategorias: [
          { nome: "Copos e Pratos", palavrasChave: ["copo descartável", "copo descartavel", "prato descartável", "prato descartavel"] },
          { nome: "Talheres", palavrasChave: ["garfo descartável", "garfo descartavel", "faca descartável", "faca descartavel", "colher descartável", "colher descartavel", "mexedor"] },
          { nome: "Embalagens e Potes", palavrasChave: ["marmitex", "pote descartável", "pote descartavel"] },
          { nome: "Mobiliário Plástico", palavrasChave: ["cadeira de plástico", "cadeira de plastico", "mesa de plástico", "mesa de plastico"] }
        ]
      },
      {
        nome: "Geriátricos e Incontinência",
        subcategorias: [
          { nome: "Fraldas e Calças", palavrasChave: ["fralda geriátrica", "fralda geriatrica", "calça geriátrica", "calca geriatrica", "incontinência"] },
          { nome: "Descartáveis Clínicos", palavrasChave: ["luva descartável", "avental descartável", "máscara descartável", "lençol descartável"] }
        ]
      }
    ];

    await this.categoriaModel.insertMany(seedData);
    this.logger.log('Seed de categorias finalizado com sucesso.');
  }

  async getCategorias() {
    return this.categoriaModel.find().exec();
  }

  categorizeProduto(nomeProduto: string): string {
    if (!nomeProduto) return "OUTROS";
    const cleanNome = nomeProduto.toLowerCase().trim();
    
    // Busca na cache em vez de no banco pra ser síncrono e muito rápido
    for (const cat of this.categoriasCache) {
      if (!cat.subcategorias) continue;

      for (const sub of cat.subcategorias) {
        if (!sub.palavrasChave) continue;

        for (const p of sub.palavrasChave) {
          const keyword = p.toLowerCase().trim();
          // Evitar falsos positivos com palavras muito curtas
          if (keyword.length < 3) continue;

          // Idealmente usando regex com word boundaries se for uma palavra comum,
          // mas startsWith/includes já é como o catálogo anterior operava.
          if (cleanNome.includes(keyword) || keyword.includes(cleanNome)) {
            return cat.nome; // Retornamos apenas a Categoria Principal (ex: "Cereais e Grãos")
          }
        }
      }
    }
    
    return "OUTROS";
  }
}
