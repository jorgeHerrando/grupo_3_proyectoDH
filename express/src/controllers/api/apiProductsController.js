// para trabajar con la DB
const { sequelize } = require("../../database/models");
const db = require("../../database/models");

const Op = db.Sequelize.Op;

const apiProductsController = {
  // listar todos productos
  list: async (req, res) => {
    try {
      // PRODUCTS PAGINATION
      const pageAsNumber = parseInt(req.query.page);
      const limit = 10;

      // definimos la paginación
      let page = 1;
      // si es número lo que llega en el string
      if (!Number.isNaN(pageAsNumber) && pageAsNumber > 1) {
        page = pageAsNumber;
      }

      // MUESTRA DE PRODUCTOS CON OFFSET-LIMIT
      const products = await db.Product.findAll({
        limit: limit,
        offset: (page - 1) * limit,
        include: [
          { association: "images", attributes: ["name"] },
          {
            association: "sizes",
            attributes: ["name"],
            // para que no traiga la tabla intermedia
            through: { attributes: [] },
          },
        ],
        attributes: ["id", "name", "description", "price"],
        order: [["id", "ASC"]],
      });

      // por cada producto
      products.forEach((product) => {
        let images_url = [];
        // por cada imagen pusheamos su url en la variable de arriba
        product.images.forEach((image) => {
          images_url.push(
            `http://localhost:3001/images/products/${image.name}`
          );
        });
        // creamos dataValue images_url
        product.dataValues.images_url = images_url;

        // creamos dataValue detail
        product.dataValues.detail = `http://localhost:3001/api/products/${product.id}`;
      });

      // MUESTRA COUNT POR CATEGORÍA
      //   llamamos a todas las categorías con sus productos
      const categories = await db.Category.findAll({
        include: ["products"],
        attributes: ["name"],
        order: [["id", "ASC"]],
      });
      //   guardaremos todo en un obj.literal
      let categoryCount = {};
      // y aquí la cuenta de todos los productos
      let count = 0;
      //   por cada categoría introduce key-value en categoryCount
      for (let category of categories) {
        // meter key-value en un objeto literal
        categoryCount[category.name] = category.products.length;
        // contar los productos
        count += category.products.length;
      }

      const totalPages = Math.ceil(count / limit);

      //   mostramos todo
      res.status(200).json({
        meta: {
          count: count,
          countByCategory: categoryCount,
          totalPages,
          currentPage: page,
          next:
            page < totalPages && page > 0
              ? `http://localhost:3001/api/products/?page=${page + 1}`
              : undefined,
          previous:
            page > 1 && page <= totalPages
              ? `http://localhost:3001/api/products/?page=${page - 1}`
              : undefined,
        },
        products,
      });
    } catch (e) {
      res.status(500).json({
        meta: {
          status: "error",
        },
        error: "Products not found",
      });
    }
  },

  lastProduct: async (req, res) => {
    try {
      // MUESTRA DE PRODUCTO
      const products = await db.Product.findAll({
        include: [
          { association: "images", attributes: ["name"] },
          { association: "brand", attributes: ["name"] },
          {
            association: "sizes",
            attributes: ["name"],
            // para que no traiga la tabla intermedia
            through: { attributes: [] },
          },
        ],
        attributes: ["id", "name", "description", "sale", "price", "discount"],
        order: [["id", "ASC"]],
      });

      // saca el último
      let lastProduct = products.pop();

      let images_url = [];
      // por cada imagen pusheamos su url en la variable de arriba
      lastProduct.images.forEach((image) => {
        images_url.push(`http://localhost:3001/images/products/${image.name}`);
      });
      // creamos dataValue images_url
      lastProduct.dataValues.images_url = images_url;

      // creamos dataValue detail
      lastProduct.dataValues.detail = `http://localhost:3001/api/products/${lastProduct.id}`;

      //   mostramos todo
      res.status(200).json({
        product: lastProduct,
      });
    } catch (e) {
      res.status(500).json({
        meta: {
          status: "error",
        },
        error: "Product not found",
      });
    }
  },

  categories: async (req, res) => {
    try {
      // MUESTRA CATEGORÍA
      //   llamamos a todas las categorías con sus productos
      const categories = await db.Category.findAll({
        include: ["products"],
        attributes: ["name"],
        order: [["id", "ASC"]],
      });

      //   mostramos todo
      res.status(200).json({
        meta: {
          count: categories.length,
        },
        categories,
      });
    } catch (e) {
      res.status(500).json({
        meta: {
          status: "error",
        },
        error: "Categories not found",
      });
    }
  },

  subcategories: async (req, res) => {
    try {
      // MUESTRA CATEGORÍA
      //   llamamos a todas las categorías con sus productos
      const subcategories = await db.Subcategory.findAll({
        include: ["products"],
        attributes: ["name"],
        order: [["id", "ASC"]],
      });

      //   mostramos todo
      res.status(200).json({
        meta: {
          count: subcategories.length,
        },
        subcategories,
      });
    } catch (e) {
      res.status(500).json({
        meta: {
          status: "error",
        },
        error: "Subcategories not found",
      });
    }
  },

  brands: async (req, res) => {
    try {
      // MUESTRA MARCAS
      //   llamamos a todas las mascas con sus productos
      const brands = await db.Brand.findAll({
        include: ["products"],
        attributes: ["name"],
        order: [["id", "ASC"]],
      });

      //   mostramos todo
      res.status(200).json({
        meta: {
          count: brands.length,
        },
        brands,
      });
    } catch (e) {
      res.status(500).json({
        meta: {
          status: "error",
        },
        error: "Brands not found",
      });
    }
  },

  orders: async (req, res) => {
    try {
      // MUESTRA MARCAS
      //   llamamos a todas las mascas con sus productos
      const orders = await db.Order.findAll({
        include: ["user"],
        order: [["id", "ASC"]],
      });

      //   mostramos todo
      res.status(200).json({
        meta: {
          count: orders.length,
        },
        orders,
      });
    } catch (e) {
      res.status(500).json({
        meta: {
          status: "error",
        },
        error: "Orders not found",
      });
    }
  },

  sales: async (req, res) => {
    try {
      // MUESTRA SALES
      //   llamamos a todos productos con sus ventas
      const products = await db.Product.findAll({
        include: ["orderDetails"],
        attributes: ["name", "price"],
        order: [["id", "ASC"]],
      });

      // vamos a sacar los productos con ventas
      let productsWithSales = [];

      // y guardarlos en el array
      for (let product of products) {
        if (product.orderDetails.length > 0) {
          productsWithSales.push(product);
        }
      }

      // objetos a mostrar
      let productsToShow = [];

      // de cada uno de los que tienen ventas armamos un objeto literal con propiedades
      for (let productSale of productsWithSales) {
        let amount = 0;
        let totalPrice = 0;
        let productObject = {};

        // por cada detalle de orden suma la cantidad de productos y los precios totales
        productSale.orderDetails.forEach((detail) => {
          amount += detail.amount;
          totalPrice = totalPrice + detail.amount * Number(detail.price);
        });

        // crear key-value en el object
        productObject["name"] = productSale.name;
        productObject["price"] = Number(productSale.price);
        productObject["amount"] = amount;
        productObject["totalPrice"] = totalPrice;

        // y lo pusheamos a lo que queremos mostrar
        productsToShow.push(productObject);
      }

      //   mostramos todo
      res.status(200).json({
        meta: {
          count: productsToShow.length,
        },
        products: productsToShow,
      });
    } catch (e) {
      res.status(500).json({
        meta: {
          status: "error",
        },
        error: "Orders not found",
      });
    }
  },

  topFive: async (req, res) => {
    let limit = 5;
    const top = req.params.top;
    if (top) {
      limit = Number(top);
    }

    try {
      // MUESTRA SALES
      //   llamamos a las orderDetails
      const maxOrders = await db.OrderDetail.findAll({
        // nos trae la columna product_id y el sumatorio de la columna amount según product_id
        attributes: [
          "product_id",
          [sequelize.fn("sum", sequelize.col("amount")), "totalAmount"],
        ],
        // esta es la agrupación
        group: ["product_id"],
        // de mayor a menor
        order: sequelize.literal("totalAmount DESC"),
        // que incluya el nombre del producto
        include: [{ association: "product", attributes: ["name"] }],
        limit: limit,
      });

      //   mostramos todo
      res.status(200).json({
        meta: {
          count: maxOrders.length,
        },
        products: maxOrders,
      });
    } catch (e) {
      res.status(500).json({
        meta: {
          status: "error",
        },
        error: "Orders not found",
      });
    }
  },

  // detalle de un user
  detail: async (req, res) => {
    // recuperamos id
    const id = req.params.id;
    try {
      // traemos todos los sizes
      const sizes = await db.Size.findAll({
        attributes: ["id", "name"],
      });

      // traemos el producto y todas asociaciones necesarias
      const product = await db.Product.findOne({
        include: [
          { association: "brand", attributes: ["name"] },
          { association: "category", attributes: ["name"] },
          { association: "subcategory", attributes: ["name"] },
          { association: "images", attributes: ["name"] },
          {
            association: "sizes",
            attributes: ["name"],
            // para que no traiga la tabla intermedia
            through: { attributes: [] },
          },
          {
            association: "tags",
            attributes: ["name"],
            // para que no traiga la tabla intermedia
            through: { attributes: [] },
          },
          { association: "stocks", attributes: ["amount", "size_id"] },
        ],
        attributes: {
          exclude: [
            "createdAt",
            "updatedAt",
            "deletedAt",
            "category_id",
            "subcategory_id",
            "brand_id",
          ],
        },
        where: {
          id: id,
        },
      });

      // creamos nuevos values
      product.dataValues.brand = product.brand.name;
      product.dataValues.category = product.category.name;
      // solo si tiene subcategory
      product.dataValues.subcategory = product.subcategory
        ? product.subcategory.name
        : null;

      // por cada uno de los stocks asociados al producto que trae
      for (let stock of product.stocks) {
        // por cada una de las tallas
        for (let size of sizes) {
          // si coincide con la del stock
          if (size.id == stock.dataValues.size_id) {
            stock.dataValues.size = size.name;
          }
        }
        // no mostramos el size_id
        stock.dataValues.size_id = undefined;
      }

      // por cada imagen de producto
      for (let image of product.images) {
        // le añadimos una url
        image.dataValues.url = `http://localhost:3001/images/products/${image.name}`;
      }
      // le mandamos el product con la info
      res.status(200).json({
        product,
      });
    } catch (e) {
      res.status(500).json({
        meta: {
          status: "error",
        },
        error: "User not found",
      });
    }
  },
};

module.exports = apiProductsController;
